/**
 * Pyodide Web Worker — executes Python code in a sandboxed WASM environment.
 *
 * Messages:
 *   { type: "init" }                      → Load Pyodide (idempotent)
 *   { type: "run", id, code, testCases }  → Execute code against test cases
 *
 * Responses:
 *   { type: "init-done" }
 *   { type: "init-error", error }
 *   { type: "result", id, results: [{ input, expected, actual, passed }] }
 *   { type: "error", id, error }
 */

/* global importScripts, self */

let pyodide = null;
let loading = false;

const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.27.4/full/";
const TIMEOUT_MS = 5000;

async function loadPyodideRuntime() {
  if (pyodide) return;
  if (loading) return;
  loading = true;

  try {
    importScripts(PYODIDE_CDN + "pyodide.js");
    pyodide = await loadPyodide({ indexURL: PYODIDE_CDN });
    self.postMessage({ type: "init-done" });
  } catch (err) {
    self.postMessage({ type: "init-error", error: String(err) });
    loading = false;
  }
}

/**
 * Run user code against test cases.
 * Each test case: { input: string (Python expression), expected: string (Python expression) }
 * The user code should define one or more functions. We call the last defined function with the input.
 */
async function runTests(id, code, testCases) {
  if (!pyodide) {
    self.postMessage({ type: "error", id, error: "Pyodide not loaded" });
    return;
  }

  const results = [];

  for (const tc of testCases) {
    try {
      // Run user code + test in isolated namespace
      const wrapper = `
import json, signal, ast

_ns = {}
exec(${JSON.stringify(code)}, _ns)

# Find the last defined function
_funcs = [v for v in _ns.values() if callable(v) and not v.__name__.startswith('_')]
if not _funcs:
    raise ValueError("No function defined in your code")
_fn = _funcs[-1]

_input = ast.literal_eval(${JSON.stringify(tc.input)})
if isinstance(_input, tuple):
    _result = _fn(*_input)
else:
    _result = _fn(_input)
_expected = ast.literal_eval(${JSON.stringify(tc.expected)})
`;

      // Execute with timeout
      const timeoutId = setTimeout(() => {
        try { pyodide.interruptExecution(); } catch { /* ok */ }
      }, TIMEOUT_MS);

      await pyodide.runPythonAsync(wrapper);
      clearTimeout(timeoutId);

      const actual = await pyodide.runPythonAsync(`
# Normalize for comparison: sort nested lists for order-independent matching
def _normalize(val):
    if isinstance(val, list):
        try:
            return sorted([_normalize(x) for x in val], key=lambda x: str(x))
        except TypeError:
            return [_normalize(x) for x in val]
    return val

_passed = _normalize(_result) == _normalize(_expected)
json.dumps({"actual": repr(_result), "passed": bool(_passed)})
`);

      const parsed = JSON.parse(actual);
      results.push({
        input: tc.input,
        expected: tc.expected,
        actual: parsed.actual,
        passed: parsed.passed,
      });
    } catch (err) {
      results.push({
        input: tc.input,
        expected: tc.expected,
        actual: String(err).split("\n").pop() || String(err),
        passed: false,
      });
    }
  }

  self.postMessage({ type: "result", id, results });
}

/**
 * Run arbitrary user code and capture stdout.
 * If code contains bare `return` statements (outside a function), wrap it in
 * a function so it doesn't cause "SyntaxError: 'return' outside function".
 */
async function runCode(id, code) {
  if (!pyodide) {
    self.postMessage({ type: "run-code-error", id, error: "Pyodide not loaded" });
    return;
  }

  try {
    const timeoutId = setTimeout(() => {
      try { pyodide.interruptExecution(); } catch { /* ok */ }
    }, TIMEOUT_MS);

    // Redirect stdout to capture prints
    await pyodide.runPythonAsync(`
import sys, io
_capture_stdout = io.StringIO()
sys.stdout = _capture_stdout
`);

    // Detect bare `return` at top-level indentation and wrap in a function
    let execCode = code;
    const lines = code.split("\n");
    const hasBareReturn = lines.some(
      (l) => /^return\b/.test(l.trimStart()) && (l.length - l.trimStart().length === 0)
    );
    if (hasBareReturn) {
      // Indent all lines inside a wrapper function, call it, and print the result
      const indented = lines.map((l) => "    " + l).join("\n");
      execCode = `def _user_fn():\n${indented}\n_result = _user_fn()\nif _result is not None:\n    print(_result)`;
    }

    await pyodide.runPythonAsync(execCode);
    clearTimeout(timeoutId);

    const output = await pyodide.runPythonAsync(`
sys.stdout = sys.__stdout__
_capture_stdout.getvalue()
`);

    self.postMessage({ type: "run-code-result", id, output: output || "" });
  } catch (err) {
    // Restore stdout on error
    try {
      await pyodide.runPythonAsync("sys.stdout = sys.__stdout__");
    } catch { /* ok */ }

    const errorMsg = String(err).split("\n").filter(l => l.trim()).pop() || String(err);
    self.postMessage({ type: "run-code-error", id, error: errorMsg });
  }
}

self.onmessage = async (e) => {
  const { type, id, code, testCases } = e.data;

  if (type === "init") {
    await loadPyodideRuntime();
  } else if (type === "run") {
    await runTests(id, code, testCases);
  } else if (type === "run-code") {
    await runCode(id, code);
  }
};
