export interface Cheatsheet {
  category: string;
  triggers: string[];
  variants: string[];
  whenToUse: string[];
  keyIdea: string;
  canonicalProblems: { name: string; note: string }[];
  templates: { label: string; code: string }[];
  complexity: string;
  watchOut: string[];
}

export const CHEATSHEETS: Cheatsheet[] = [
  {
    category: "Arrays & Hashing",
    triggers: [
      '"find two numbers that sum to target"',
      '"check if duplicates exist"',
      '"group anagrams together"',
      '"count frequency of elements"',
    ],
    variants: [
      "Frequency map — count occurrences for top-K or majority element",
      "Complement lookup — store seen values, check target - x on each step",
      "Grouping key — sort each element or use a canonical form as the map key",
    ],
    whenToUse: [
      "Need O(1) membership check, frequency count, or complement lookup",
      "Group items by some property (anagrams → sorted key, counts → value)",
      "Any time a nested loop scan looks O(n²) — a hash map likely fixes it",
    ],
    keyIdea:
      "Trade space for time by storing seen values or counts in a hash map/set so you never scan the array twice.",
    canonicalProblems: [
      { name: "Two Sum", note: "classic complement lookup" },
      { name: "Group Anagrams", note: "sorted string as grouping key" },
      { name: "Top K Frequent Elements", note: "frequency map + heap or bucket sort" },
    ],
    templates: [
      {
        label: "Complement lookup",
        code: `seen = {}
for i, x in enumerate(nums):
    if target - x in seen:
        return [seen[target - x], i]
    seen[x] = i`,
      },
    ],
    complexity: "T: O(n) · S: O(n)",
    watchOut: [
      "Using a list for membership checks → accidentally O(n²)",
      "Off-by-one: store the index, not just True, when you need to return positions",
    ],
  },
  {
    category: "Two Pointers",
    triggers: [
      '"find pair/triplet that sums to target in sorted array"',
      '"remove duplicates in-place"',
      '"is this string a palindrome"',
      '"container with most water"',
    ],
    variants: [
      "Converging — left at start, right at end; move based on comparison",
      "Same direction (slow/fast) — remove duplicates, partition arrays",
      "Three pointers — fix one element, converge the other two (3Sum)",
    ],
    whenToUse: [
      "Array/string is sorted (or you can sort it without losing information)",
      "Looking for a pair or triplet satisfying a sum/distance condition",
      "Need to remove duplicates, partition, or compare from both ends in O(1) space",
    ],
    keyIdea:
      "Place one pointer at each end and converge based on a condition — eliminates the need for a nested loop.",
    canonicalProblems: [
      { name: "Valid Palindrome", note: "converge, skip non-alphanumeric" },
      { name: "3Sum", note: "sort + fix one, converge the other two" },
      { name: "Container With Most Water", note: "move the shorter side inward" },
    ],
    templates: [
      {
        label: "Converging — pair sum",
        code: `left, right = 0, len(arr) - 1
while left < right:
    s = arr[left] + arr[right]
    if s == target:   return [left, right]
    elif s < target:  left  += 1
    else:             right -= 1`,
      },
      {
        label: "Same direction — remove duplicates",
        code: `slow = 0
for fast in range(1, len(arr)):
    if arr[fast] != arr[slow]:
        slow += 1
        arr[slow] = arr[fast]
return slow + 1`,
      },
    ],
    complexity: "T: O(n) · S: O(1)",
    watchOut: [
      "Forgetting to sort first — converging only works on sorted input",
      "Loop condition: left < right for pairs, left <= right for single pointer reaching center",
    ],
  },
  {
    category: "Sliding Window",
    triggers: [
      '"longest/shortest substring with [constraint]"',
      '"maximum sum subarray of size k"',
      '"at most k distinct characters"',
      '"minimum window containing all characters of t"',
    ],
    variants: [
      "Fixed window — slide a constant-size window, O(1) update per step",
      "Variable window — expand right, shrink left when constraint is violated",
      "Counter-based — use a dict to track character counts in the window",
    ],
    whenToUse: [
      "Subarray or substring problem with a contiguous constraint",
      'Problem says "longest/shortest X" or "maximum/minimum subarray satisfying Y"',
      "Brute force is O(n²) nested loops over subarrays — window cuts it to O(n)",
    ],
    keyIdea:
      "Expand the right edge to grow the window; shrink the left edge when a constraint is violated — each element enters and exits at most once.",
    canonicalProblems: [
      { name: "Longest Substring Without Repeating Characters", note: "variable window + set" },
      { name: "Minimum Window Substring", note: "counter-based, track 'have' vs 'need'" },
      { name: "Maximum Average Subarray I", note: "fixed-size window" },
    ],
    templates: [
      {
        label: "Variable window",
        code: `left = 0
window = {}   # or Counter / running sum
best  = 0

for right in range(len(s)):
    # add s[right] to window

    while window violates constraint:
        # remove s[left] from window
        left += 1

    best = max(best, right - left + 1)
return best`,
      },
      {
        label: "Fixed window (size k)",
        code: `window_sum = sum(arr[:k])
best = window_sum
for i in range(k, len(arr)):
    window_sum += arr[i] - arr[i - k]
    best = max(best, window_sum)
return best`,
      },
    ],
    complexity: "T: O(n) · S: O(k) — k = window or alphabet size",
    watchOut: [
      "Shrinking too aggressively — shrink only until the constraint is satisfied again",
      "Fixed vs. variable: decide which before writing; they use slightly different loops",
    ],
  },
  {
    category: "Stack",
    triggers: [
      '"valid parentheses / matching brackets"',
      '"next greater/smaller element to the right"',
      '"evaluate arithmetic expression"',
      '"daily temperatures — when does it get warmer"',
    ],
    variants: [
      "Matching — push opening tokens, pop and verify on closing tokens",
      "Monotonic decreasing — tracks next-greater; pop when current value is larger",
      "Monotonic increasing — tracks next-smaller; pop when current value is smaller",
    ],
    whenToUse: [
      "Need to match opening/closing pairs: brackets, tags, function calls",
      '"Next greater/smaller element" — process each element against a stack of candidates',
      "Expression evaluation or undo/redo operations",
    ],
    keyIdea:
      "A monotonic stack maintains a sorted invariant so that next-greater/smaller queries are answered in O(1) amortized — each element is pushed and popped at most once.",
    canonicalProblems: [
      { name: "Valid Parentheses", note: "push open, pop + verify on close" },
      { name: "Daily Temperatures", note: "monotonic decreasing stack of indices" },
      { name: "Largest Rectangle in Histogram", note: "monotonic increasing stack" },
    ],
    templates: [
      {
        label: "Matching brackets",
        code: `pairs = {')': '(', ']': '[', '}': '{'}
stack = []
for ch in s:
    if ch in '([{':      stack.append(ch)
    elif not stack or stack[-1] != pairs[ch]:
        return False
    else:                stack.pop()
return not stack`,
      },
      {
        label: "Monotonic stack — next greater",
        code: `result = [-1] * len(arr)
stack  = []   # indices
for i, val in enumerate(arr):
    while stack and arr[stack[-1]] < val:
        result[stack.pop()] = val
    stack.append(i)
return result`,
      },
    ],
    complexity: "T: O(n) · S: O(n)",
    watchOut: [
      "Always check stack is non-empty before stack[-1]",
      "Store indices in the stack, not values — you almost always need the position",
    ],
  },
  {
    category: "Binary Search",
    triggers: [
      '"sorted array, find target or its position"',
      '"minimum/maximum value that satisfies a condition"',
      '"search in rotated sorted array"',
      '"allocate minimum capacity / days to ship"',
    ],
    variants: [
      "Exact value — classic left ≤ right, shrink both sides",
      "Leftmost boundary — left < right, right = mid when feasible(mid)",
      "Search on answer space — define lo/hi over answer range, binary search feasibility",
    ],
    whenToUse: [
      "Array is sorted, or the answer space is monotone (feasible up to a threshold, then not)",
      "Finding first/last position satisfying a condition",
      "Optimization: minimize the maximum or maximize the minimum",
    ],
    keyIdea:
      "Every iteration halves the search space; the key decision is whether mid itself can be the answer, which determines whether you write right = mid or right = mid - 1.",
    canonicalProblems: [
      { name: "Binary Search", note: "exact value, classic template" },
      { name: "Find Minimum in Rotated Sorted Array", note: "leftmost boundary" },
      { name: "Koko Eating Bananas", note: "binary search on answer space" },
    ],
    templates: [
      {
        label: "Exact value",
        code: `left, right = 0, len(arr) - 1
while left <= right:
    mid = left + (right - left) // 2
    if arr[mid] == target:  return mid
    elif arr[mid] < target: left  = mid + 1
    else:                   right = mid - 1
return -1`,
      },
      {
        label: "Leftmost boundary / search on answer",
        code: `left, right = lo, hi   # define answer space
while left < right:
    mid = left + (right - left) // 2
    if feasible(mid):
        right = mid        # mid could be the answer
    else:
        left = mid + 1
return left`,
      },
    ],
    complexity: "T: O(log n) · S: O(1)",
    watchOut: [
      "right = mid vs right = mid - 1: use mid when mid can be the answer; mid - 1 when it can't",
      "Decide upfront: exact value, leftmost, or rightmost — each template is slightly different",
    ],
  },
  {
    category: "Linked List",
    triggers: [
      '"detect cycle in linked list"',
      '"reverse a linked list"',
      '"find the middle node"',
      '"remove the Nth node from the end"',
    ],
    variants: [
      "Dummy head — prepend a sentinel node to simplify insertions/deletions at the start",
      "Fast / slow pointers — slow moves 1 step, fast moves 2; meets at cycle or middle",
      "In-place reversal — prev/curr/nxt, re-wire .next pointers iteratively",
    ],
    whenToUse: [
      "In-place reversal, cycle detection, or finding the midpoint",
      "Merging sorted lists, removing Nth node from end",
      'Problem asks for O(1) extra space on a list — "do it without extra memory"',
    ],
    keyIdea:
      "Almost every linked list problem uses a dummy head (eliminates edge cases at the head) or fast/slow pointers (cycle detection, midpoint).",
    canonicalProblems: [
      { name: "Linked List Cycle", note: "fast/slow — cycle if they ever meet" },
      { name: "Reverse Linked List", note: "iterative prev/curr/nxt" },
      { name: "Merge Two Sorted Lists", note: "dummy head, compare and advance" },
    ],
    templates: [
      {
        label: "Reversal",
        code: `prev, curr = None, head
while curr:
    nxt       = curr.next
    curr.next = prev
    prev      = curr
    curr      = nxt
return prev`,
      },
      {
        label: "Fast / slow pointers",
        code: `slow = fast = head
while fast and fast.next:
    slow = slow.next
    fast = fast.next.next
# slow == midpoint
# for cycle: return slow == fast after loop`,
      },
    ],
    complexity: "T: O(n) · S: O(1)",
    watchOut: [
      "Save curr.next before overwriting it — the most common bug in reversal",
      "Use a dummy head when the result list's first node is unknown until the loop runs",
    ],
  },
  {
    category: "Trees",
    triggers: [
      '"height/depth/diameter of binary tree"',
      '"path sum equals target"',
      '"lowest common ancestor"',
      '"validate BST"',
    ],
    variants: [
      "DFS preorder — process node before children (serialization, paths from root)",
      "DFS postorder — process children first (height, diameter, any bottom-up aggregation)",
      "BFS level-order — process level by level (level averages, right side view, zigzag)",
    ],
    whenToUse: [
      "Any computation on a binary tree, BST, or n-ary tree",
      "Path sums, depth/height, LCA, serialization/deserialization",
      "BST problems: remember inorder traversal yields sorted order",
    ],
    keyIdea:
      'Most tree problems decompose into "what do I compute at this node, what do I return to my parent?" — write that recursion and the base case (None → 0 or None → True) and you\'re done.',
    canonicalProblems: [
      { name: "Diameter of Binary Tree", note: "postorder — return height, track max diameter" },
      { name: "Binary Tree Level Order Traversal", note: "BFS with level-size snapshot" },
      { name: "Lowest Common Ancestor of BST", note: "use BST ordering to decide direction" },
    ],
    templates: [
      {
        label: "DFS postorder",
        code: `def dfs(node):
    if not node: return BASE_CASE
    left  = dfs(node.left)
    right = dfs(node.right)
    # update global answer if needed
    return COMBINE(left, right, node.val)`,
      },
      {
        label: "BFS level-order",
        code: `from collections import deque
q = deque([root])
while q:
    for _ in range(len(q)):   # snapshot size first
        node = q.popleft()
        if node.left:  q.append(node.left)
        if node.right: q.append(node.right)`,
      },
    ],
    complexity: "T: O(n) · S: O(h) DFS / O(w) BFS — h = height, w = max width",
    watchOut: [
      "Base case matters: returning 0 vs None vs False — be consistent across all recursive calls",
      "BFS: capture len(q) before the inner loop, not inside it",
    ],
  },
  {
    category: "Tries",
    triggers: [
      '"implement autocomplete or prefix search"',
      '"words starting with a given prefix"',
      '"word search on a grid using a dictionary"',
      '"design a data structure that supports addWord and search with wildcards"',
    ],
    variants: [
      "Basic trie — insert + search + startsWith using dict of children",
      "Trie + DFS — word search on a grid, prune branches not in trie",
      "Compressed trie — merge single-child chains (for memory-sensitive problems)",
    ],
    whenToUse: [
      "Prefix-based lookups: autocomplete, spell check, IP routing",
      "Checking if any word in a large dictionary matches a prefix",
      "Word search on a grid where you need to prune invalid paths early",
    ],
    keyIdea:
      "A trie gives O(L) insert and lookup regardless of dictionary size — the key distinction is search (must reach a node where is_end = True) vs. starts_with (just reach the prefix node).",
    canonicalProblems: [
      { name: "Implement Trie", note: "insert / search / startsWith" },
      { name: "Word Search II", note: "trie + DFS on grid, prune with trie" },
      { name: "Design Add and Search Words Data Structure", note: "trie + wildcard DFS" },
    ],
    templates: [
      {
        label: "Trie — insert / search / starts_with",
        code: `class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end   = False

class Trie:
    def __init__(self): self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
        node.is_end = True

    def search(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children: return False
            node = node.children[ch]
        return node.is_end          # must be True

    def starts_with(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node.children: return False
            node = node.children[ch]
        return True                 # no is_end check`,
      },
    ],
    complexity: "T: O(L) per op · S: O(alphabet × total chars)",
    watchOut: [
      "search requires is_end = True; starts_with does not — mixing them up is the #1 bug",
      "Use dict for children unless the problem guarantees lowercase only (then array of 26 is fine)",
    ],
  },
  {
    category: "Heap / Priority Queue",
    triggers: [
      '"find the K largest/smallest elements"',
      '"Kth largest element in a stream"',
      '"merge K sorted lists"',
      '"top K frequent elements"',
    ],
    variants: [
      "Fixed-size min-heap of K — maintains K largest seen so far",
      "Max-heap — negate values (Python's heapq is min-only)",
      "Heap with metadata — store (priority, index, value) tuples for tie-breaking",
    ],
    whenToUse: [
      "K largest/smallest/most-frequent elements — any top-K problem",
      "Streaming minimum or maximum as elements are added",
      "Merging K sorted lists or arrays",
    ],
    keyIdea:
      "A min-heap of size K tracks the K largest elements — the heap top is always the smallest of the K largest, so you can evict it when the heap exceeds size K.",
    canonicalProblems: [
      { name: "Kth Largest Element in an Array", note: "min-heap of size K" },
      { name: "Top K Frequent Elements", note: "frequency map + heap or bucket sort" },
      { name: "Merge K Sorted Lists", note: "heap of (val, list_index, element_index)" },
    ],
    templates: [
      {
        label: "K largest — fixed min-heap",
        code: `import heapq
heap = []
for num in nums:
    heapq.heappush(heap, num)
    if len(heap) > k:
        heapq.heappop(heap)
return heap[0]   # kth largest`,
      },
      {
        label: "Max-heap (negate to simulate)",
        code: `import heapq
heap = [-x for x in nums]
heapq.heapify(heap)
return -heapq.heappop(heap)  # largest element`,
      },
    ],
    complexity: "T: O(n log k) · S: O(k)",
    watchOut: [
      "Python heapq is min-heap only — negate values for max-heap behavior",
      "K largest uses a min-heap (counterintuitive): you keep the K largest by evicting the smallest",
    ],
  },
  {
    category: "Backtracking",
    triggers: [
      '"generate all combinations/permutations/subsets"',
      '"N-queens, Sudoku solver, word search on grid"',
      '"all valid parentheses of length n"',
      '"partition string into palindromes"',
    ],
    variants: [
      "Subsets — include or exclude each element; use start index to avoid repeats",
      "Permutations — swap elements in place or use a used[] array",
      "Constraint satisfaction — N-queens, Sudoku; check validity before recursing",
    ],
    whenToUse: [
      "Enumerate all valid configurations: combinations, permutations, subsets",
      "Constraint satisfaction: N-queens, Sudoku, word search with a dictionary",
      '"How many ways to...?" when you need to count or return all solutions',
    ],
    keyIdea:
      "Build the solution incrementally; at each step try all valid choices, recurse into each, then undo the choice (backtrack) — copy results, never return a reference.",
    canonicalProblems: [
      { name: "Subsets", note: "start index prevents duplicate elements" },
      { name: "Permutations", note: "swap-based or used[] to track which are taken" },
      { name: "Word Search", note: "DFS + mark visited in-place, restore on backtrack" },
    ],
    templates: [
      {
        label: "Subsets / combinations skeleton",
        code: `def backtrack(start, path):
    results.append(path[:])   # copy at every valid state
    for i in range(start, len(nums)):
        if i > start and nums[i] == nums[i-1]:
            continue            # skip duplicates (sort first)
        path.append(nums[i])
        backtrack(i + 1, path)  # i+1 = no reuse; i = reuse allowed
        path.pop()

nums.sort()
results = []
backtrack(0, [])`,
      },
    ],
    complexity: "T: O(n × 2ⁿ) subsets · O(n × n!) permutations · S: O(n) stack",
    watchOut: [
      "Append path[:] not path — returning the reference means all entries point to the same list",
      "For duplicate inputs: sort first, then skip if i > start and nums[i] == nums[i-1]",
    ],
  },
  {
    category: "Graphs",
    triggers: [
      '"number of islands / connected components"',
      '"can you reach node A from node B"',
      '"course schedule — detect cycle in directed graph"',
      '"clone graph"',
    ],
    variants: [
      "BFS — shortest path in unweighted graph; level-by-level expansion",
      "DFS — connectivity, cycle detection, topological sort",
      "Topological sort — BFS with in-degree (Kahn's) or DFS with post-order",
    ],
    whenToUse: [
      "Connected components, path existence, flood fill, island counting",
      "Shortest path in an unweighted graph (BFS gives optimal)",
      "Dependency ordering: course prerequisites, build systems",
    ],
    keyIdea:
      "Represent as adjacency list; BFS for shortest path, DFS for connectivity — always mark visited before enqueuing/recursing to avoid revisiting nodes.",
    canonicalProblems: [
      { name: "Number of Islands", note: "DFS/BFS, mark visited in-place" },
      { name: "Course Schedule", note: "cycle detection in directed graph" },
      { name: "Rotting Oranges", note: "multi-source BFS from all rotten cells" },
    ],
    templates: [
      {
        label: "BFS — shortest path",
        code: `from collections import deque
visited = {start}
q = deque([(start, 0)])
while q:
    node, dist = q.popleft()
    if node == target: return dist
    for nb in graph[node]:
        if nb not in visited:
            visited.add(nb)    # mark BEFORE enqueue
            q.append((nb, dist + 1))
return -1`,
      },
      {
        label: "DFS — connected components",
        code: `def dfs(node):
    visited.add(node)
    for nb in graph[node]:
        if nb not in visited: dfs(nb)

visited = set()
components = 0
for node in all_nodes:
    if node not in visited:
        components += 1
        dfs(node)`,
      },
    ],
    complexity: "T: O(V + E) · S: O(V)",
    watchOut: [
      "Mark visited before adding to the queue — not after popping — to prevent duplicate entries",
      "Directed graphs: cycle detection needs an in_stack / gray set separate from visited",
    ],
  },
  {
    category: "Advanced Graphs",
    triggers: [
      '"cheapest flight within K stops"',
      '"network delay time / minimum time to reach all nodes"',
      '"minimum cost to connect all points (MST)"',
      '"find critical connections in a network"',
    ],
    variants: [
      "Dijkstra — non-negative weights, min-heap, O((V+E) log V)",
      "Bellman-Ford — negative weights ok, O(VE); detect negative cycles",
      "Kruskal / Prim — minimum spanning tree; Kruskal uses Union-Find on sorted edges",
    ],
    whenToUse: [
      "Weighted shortest path: Dijkstra for non-negative weights, Bellman-Ford otherwise",
      "Minimum spanning tree: Kruskal (sparse graphs) or Prim (dense graphs)",
      "Strongly connected components, bridges and articulation points",
    ],
    keyIdea:
      "Dijkstra greedily expands the cheapest unvisited node using a min-heap; always skip stale heap entries with if d > dist[u]: continue.",
    canonicalProblems: [
      { name: "Network Delay Time", note: "Dijkstra from source, return max dist" },
      { name: "Min Cost to Connect All Points", note: "Prim's MST on complete graph" },
      { name: "Cheapest Flights Within K Stops", note: "Bellman-Ford with K iterations" },
    ],
    templates: [
      {
        label: "Dijkstra",
        code: `import heapq
dist = {u: float('inf') for u in graph}
dist[src] = 0
heap = [(0, src)]
while heap:
    d, u = heapq.heappop(heap)
    if d > dist[u]: continue        # stale entry
    for v, w in graph[u]:
        if dist[u] + w < dist[v]:
            dist[v] = dist[u] + w
            heapq.heappush(heap, (dist[v], v))
return dist`,
      },
      {
        label: "Union-Find (for Kruskal's MST)",
        code: `parent = list(range(n))
def find(x):
    if parent[x] != x: parent[x] = find(parent[x])
    return parent[x]
def union(x, y):
    px, py = find(x), find(y)
    if px == py: return False   # would create cycle
    parent[px] = py
    return True

edges.sort(key=lambda e: e[2])   # sort by weight
mst_cost = 0
for u, v, w in edges:
    if union(u, v): mst_cost += w`,
      },
    ],
    complexity: "Dijkstra T: O((V+E) log V) · Kruskal T: O(E log E) · S: O(V+E)",
    watchOut: [
      "Dijkstra fails with negative edge weights — use Bellman-Ford instead",
      "Always check if d > dist[u]: continue at the top of the Dijkstra loop",
    ],
  },
  {
    category: "1-D Dynamic Programming",
    triggers: [
      '"maximum profit / minimum cost over a sequence"',
      '"how many ways to reach the top / make change"',
      '"longest increasing subsequence"',
      '"house robber — can\'t take adjacent"',
    ],
    variants: [
      "Linear scan — dp[i] depends only on dp[i-1] (or i-1 and i-2); space reducible to O(1)",
      "Choice at each step — take or skip (knapsack-style); usually dp[i] = max of options",
      "Subsequence — dp[i] = best ending at i; O(n²) with inner scan, O(n log n) with patience sort",
    ],
    whenToUse: [
      "Optimal value (max/min) over a sequence with overlapping subproblems",
      '"How many ways to reach X" counting problems',
      "Fibonacci-style: current answer depends on a small number of previous answers",
    ],
    keyIdea:
      "Define dp[i] precisely — e.g., 'max profit using first i items' — then write the recurrence from that definition; the rest follows.",
    canonicalProblems: [
      { name: "Climbing Stairs", note: "dp[i] = dp[i-1] + dp[i-2]" },
      { name: "House Robber", note: "dp[i] = max(dp[i-1], dp[i-2] + nums[i])" },
      { name: "Longest Increasing Subsequence", note: "O(n²) dp or O(n log n) patience sort" },
    ],
    templates: [
      {
        label: "Bottom-up tabulation",
        code: `dp = [0] * (n + 1)
dp[0], dp[1] = BASE0, BASE1

for i in range(2, n + 1):
    dp[i] = max/min/sum of dp[i-1], dp[i-2], ...

return dp[n]

# Space optimization when dp[i] only needs last 2:
prev2, prev1 = BASE0, BASE1
for i in range(2, n + 1):
    curr  = f(prev1, prev2)
    prev2 = prev1
    prev1 = curr
return prev1`,
      },
    ],
    complexity: "T: O(n) · S: O(n), often O(1) with rolling variables",
    watchOut: [
      "Define dp[i] unambiguously before writing the recurrence — vague definitions cause off-by-one recurrences",
      "Base cases dp[0] and dp[1] must be explicit; don't rely on default 0 being correct",
    ],
  },
  {
    category: "2-D Dynamic Programming",
    triggers: [
      '"unique paths in a grid"',
      '"edit distance between two strings"',
      '"longest common subsequence"',
      '"0/1 knapsack — items with weights and values"',
    ],
    variants: [
      "Grid DP — dp[i][j] depends on dp[i-1][j] and dp[i][j-1]",
      "Two-string DP — dp[i][j] represents prefix of s1 and s2; LCS, edit distance",
      "Knapsack — dp[i][w] = best value using first i items with capacity w",
    ],
    whenToUse: [
      "Grid problems: unique paths, minimum path sum, count paths",
      "Two-string problems: LCS, edit distance, interleaving strings",
      "Knapsack: select items with weight/value constraints",
    ],
    keyIdea:
      "Define dp[i][j] precisely, initialize the first row/column as base cases, then fill left-to-right top-to-bottom — each cell depends only on already-computed cells.",
    canonicalProblems: [
      { name: "Unique Paths", note: "dp[i][j] = dp[i-1][j] + dp[i][j-1]" },
      { name: "Longest Common Subsequence", note: "match or take best of skip-either" },
      { name: "Edit Distance", note: "insert/delete/replace costs; 3-way recurrence" },
    ],
    templates: [
      {
        label: "Two strings — LCS",
        code: `dp = [[0] * (n + 1) for _ in range(m + 1)]
for i in range(1, m + 1):
    for j in range(1, n + 1):
        if s1[i-1] == s2[j-1]:
            dp[i][j] = dp[i-1][j-1] + 1
        else:
            dp[i][j] = max(dp[i-1][j], dp[i][j-1])
return dp[m][n]`,
      },
      {
        label: "Grid paths",
        code: `dp = [[0] * cols for _ in range(rows)]
dp[0][0] = 1
for i in range(rows):
    for j in range(cols):
        if i > 0: dp[i][j] += dp[i-1][j]
        if j > 0: dp[i][j] += dp[i][j-1]
return dp[-1][-1]`,
      },
    ],
    complexity: "T: O(m × n) · S: O(m × n), reducible to O(n) with rolling row",
    watchOut: [
      "1-indexed dp vs 0-indexed input — dp[i] corresponds to s[i-1]; be consistent",
      "Initialize the first row and column explicitly — they are the base cases",
    ],
  },
  {
    category: "Greedy",
    triggers: [
      '"can you reach the last index (jump game)"',
      '"maximum number of non-overlapping intervals"',
      '"minimum number of arrows to burst balloons"',
      '"gas station — can you complete the circuit"',
    ],
    variants: [
      "Interval scheduling — sort by end time, always pick earliest-ending compatible interval",
      "Reach / coverage — track max reachable index as you scan left to right",
      "Balance — accumulate and reset when balance goes negative (gas station, stock profit)",
    ],
    whenToUse: [
      "Interval scheduling: sort by end time and greedily pick non-overlapping intervals",
      "Jump game-style: scan left to right tracking the furthest reachable index",
      "When local optimality provably leads to global optimality (prove by exchange argument)",
    ],
    keyIdea:
      "Make the locally best choice at each step without revisiting — but confirm greedy is safe first; problems with 'take or leave' over a large set usually need DP.",
    canonicalProblems: [
      { name: "Jump Game", note: "track max reachable index; return False if i > reach" },
      { name: "Non-overlapping Intervals", note: "sort by end, greedily keep earliest-ending" },
      { name: "Gas Station", note: "total gas ≥ total cost iff solution exists; find start" },
    ],
    templates: [
      {
        label: "Jump game",
        code: `reach = 0
for i, jump in enumerate(nums):
    if i > reach: return False
    reach = max(reach, i + jump)
return True`,
      },
      {
        label: "Interval scheduling — max non-overlapping",
        code: `intervals.sort(key=lambda x: x[1])   # sort by end
count = 0; last_end = float('-inf')
for start, end in intervals:
    if start >= last_end:
        count += 1; last_end = end
return count`,
      },
    ],
    complexity: "T: O(n log n) sort + O(n) scan · S: O(1)",
    watchOut: [
      "Sort by end time for interval scheduling, not start time",
      "When unsure if greedy is safe, try a small counterexample before committing",
    ],
  },
  {
    category: "Intervals",
    triggers: [
      '"merge all overlapping intervals"',
      '"minimum meeting rooms needed"',
      '"insert interval into sorted non-overlapping list"',
      '"maximum CPU load at any point"',
    ],
    variants: [
      "Merge — sort by start, extend end when overlap; collect into result list",
      "Count overlap — split starts/ends, scan with two pointers or use heap of end times",
      "Insert — split existing intervals into before, overlapping, after; merge overlapping group",
    ],
    whenToUse: [
      "Merging overlapping ranges into a consolidated list",
      "Finding the maximum concurrent overlap (meeting rooms, CPU load)",
      "Inserting a new interval while maintaining sorted non-overlapping order",
    ],
    keyIdea:
      "Sort by start time; two intervals [a,b] and [c,d] overlap when c ≤ b — merge by extending b to max(b, d).",
    canonicalProblems: [
      { name: "Merge Intervals", note: "sort by start, extend last interval or append" },
      { name: "Meeting Rooms II", note: "min-heap of end times tracks room availability" },
      { name: "Insert Interval", note: "skip non-overlapping, merge all overlapping, append rest" },
    ],
    templates: [
      {
        label: "Merge overlapping intervals",
        code: `intervals.sort(key=lambda x: x[0])
merged = [intervals[0]]
for start, end in intervals[1:]:
    if start <= merged[-1][1]:
        merged[-1][1] = max(merged[-1][1], end)
    else:
        merged.append([start, end])
return merged`,
      },
      {
        label: "Minimum meeting rooms (heap of end times)",
        code: `import heapq
intervals.sort(key=lambda x: x[0])
heap = []   # active meeting end times
for start, end in intervals:
    if heap and heap[0] <= start:
        heapq.heapreplace(heap, end)
    else:
        heapq.heappush(heap, end)
return len(heap)`,
      },
    ],
    complexity: "T: O(n log n) · S: O(n)",
    watchOut: [
      "≤ vs < in the overlap check — [1,3] and [3,5] share the endpoint; decide if that counts",
      "Store intervals as lists (not tuples) when mutating merged[-1][1] in-place",
    ],
  },
  {
    category: "Bit Manipulation",
    triggers: [
      '"find the one number that appears only once"',
      '"count the number of 1 bits"',
      '"check if a number is a power of 2"',
      '"generate all subsets using bitmask"',
    ],
    variants: [
      "XOR cancellation — a ^ a = 0; XOR all elements to isolate the unique one",
      "Bit tricks — x & (x-1) clears lowest set bit; use for counting or power-of-2 check",
      "Bitmask enumeration — iterate 0 to 2ⁿ - 1, each bit = include/exclude element",
    ],
    whenToUse: [
      "Find single non-duplicate in an array of pairs (XOR all elements)",
      "Counting set bits, checking power-of-2, toggling individual flags",
      "Enumerate all 2ⁿ subsets in O(1) space per subset",
    ],
    keyIdea:
      "XOR is self-inverse (a ^ a = 0, a ^ 0 = a) — XOR-ing all elements cancels duplicates and leaves the unique one.",
    canonicalProblems: [
      { name: "Single Number", note: "XOR all elements; duplicates cancel" },
      { name: "Number of 1 Bits", note: "Brian Kernighan: x &= (x-1) drops lowest set bit" },
      { name: "Counting Bits", note: "dp: bits[i] = bits[i >> 1] + (i & 1)" },
    ],
    templates: [
      {
        label: "Common bit operations",
        code: `x & (x - 1)    # clear lowest set bit; == 0 iff x is power of 2
x & (-x)       # isolate lowest set bit
x ^ x == 0     # XOR self-cancellation
a ^ b ^ a == b # find unique among pairs

# Count set bits (Brian Kernighan)
count = 0
while x:
    x &= (x - 1)
    count += 1`,
      },
      {
        label: "Enumerate all subsets",
        code: `for mask in range(1 << n):
    subset = [nums[i] for i in range(n) if mask & (1 << i)]`,
      },
    ],
    complexity: "T: O(1) per bit op · O(2ⁿ) for subset enumeration · S: O(1)",
    watchOut: [
      "Python has arbitrary-precision ints so no overflow, but in Java/C++ use long near 32/64 bits",
      "~x in Python gives -(x+1) — use x ^ ((1 << n) - 1) to flip exactly n bits",
    ],
  },
  {
    category: "Math & Geometry",
    triggers: [
      '"find all prime numbers up to N"',
      '"rotate matrix 90 degrees in-place"',
      '"spiral matrix traversal"',
      '"GCD / LCM of two numbers"',
    ],
    variants: [
      "Number theory — GCD (Euclidean), LCM, prime sieve, modular arithmetic",
      "Matrix in-place — transpose + reverse rows (90° CW); swap boundary layers (spiral)",
      "Geometry — cross product for collinearity, Manhattan vs. Euclidean distance",
    ],
    whenToUse: [
      "Prime detection or factorization problems",
      "In-place matrix operations: rotate, transpose, spiral traversal",
      "GCD/LCM in fraction simplification, cycle detection, scheduling",
    ],
    keyIdea:
      "Know GCD and the sieve cold; in-place matrix rotation is always transpose + reverse (direction depends on CW vs CCW).",
    canonicalProblems: [
      { name: "Rotate Image", note: "transpose then reverse each row = 90° CW" },
      { name: "Spiral Matrix", note: "shrink top/bottom/left/right boundary after each side" },
      { name: "Happy Number", note: "digit-square sum cycle detection — Floyd's or set" },
    ],
    templates: [
      {
        label: "GCD / LCM + prime sieve",
        code: `def gcd(a, b): return a if b == 0 else gcd(b, a % b)
def lcm(a, b): return a * b // gcd(a, b)

# Sieve of Eratosthenes
sieve = [True] * (n + 1)
sieve[0] = sieve[1] = False
for i in range(2, int(n**0.5) + 1):
    if sieve[i]:
        for j in range(i*i, n+1, i):
            sieve[j] = False`,
      },
      {
        label: "Rotate matrix 90° clockwise",
        code: `# Step 1: transpose (swap matrix[i][j] and matrix[j][i])
for i in range(n):
    for j in range(i + 1, n):
        matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
# Step 2: reverse each row
for row in matrix:
    row.reverse()`,
      },
    ],
    complexity: "GCD T: O(log min(a,b)) · Sieve T: O(n log log n) S: O(n)",
    watchOut: [
      "Use integer division // not / for GCD and all index math",
      "CW rotation = transpose then reverse rows; CCW = reverse rows then transpose",
    ],
  },
];

export const CHEATSHEET_MAP = new Map<string, Cheatsheet>(
  CHEATSHEETS.map((c) => [c.category, c])
);
