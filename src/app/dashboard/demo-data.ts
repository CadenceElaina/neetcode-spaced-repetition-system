/**
 * Static demo data for the signed-out interactive demo.
 * Shows a realistic user ~3 weeks into their interview prep.
 *
 * Problem IDs match the actual DB ids from problems.json.
 * Completed set: 16 problems (A&H 7/9, Two Pointers 3/5, Sliding Window 2/6, Stack 2/7, Binary Search 2/7).
 */

const today = new Date();
export const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString();
};
export const dateStr = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

// Review queue: 8 problems due for review (overdue, sorted desc by daysOverdue)
const reviewQueue = [
  { stateId: "d8", problemId: 12, title: "Trapping Rain Water", leetcodeNumber: 42, neetcodeUrl: "https://neetcode.io/problems/trapping-rain-water", difficulty: "Hard" as const, category: "Two Pointers", totalAttempts: 3, daysOverdue: 5, retrievability: 0.22, lastReviewedAt: daysAgo(12) },
  { stateId: "d5", problemId: 25, title: "Min Stack", leetcodeNumber: 155, neetcodeUrl: "https://neetcode.io/problems/minimum-stack", difficulty: "Medium" as const, category: "Stack", totalAttempts: 1, daysOverdue: 4, retrievability: 0.31, lastReviewedAt: daysAgo(11) },
  { stateId: "d3", problemId: 10, title: "Container With Most Water", leetcodeNumber: 11, neetcodeUrl: "https://neetcode.io/problems/max-water-container", difficulty: "Medium" as const, category: "Two Pointers", totalAttempts: 2, daysOverdue: 3, retrievability: 0.38, lastReviewedAt: daysAgo(10) },
  { stateId: "d6", problemId: 24, title: "Evaluate Reverse Polish Notation", leetcodeNumber: 150, neetcodeUrl: "https://neetcode.io/problems/evaluate-reverse-polish-notation", difficulty: "Medium" as const, category: "Stack", totalAttempts: 1, daysOverdue: 2, retrievability: 0.48, lastReviewedAt: daysAgo(7) },
  { stateId: "d1", problemId: 1, title: "Two Sum", leetcodeNumber: 1, neetcodeUrl: "https://neetcode.io/problems/two-integer-sum", difficulty: "Easy" as const, category: "Arrays & Hashing", totalAttempts: 3, daysOverdue: 2, retrievability: 0.45, lastReviewedAt: daysAgo(8) },
  { stateId: "d7", problemId: 32, title: "Binary Search", leetcodeNumber: 704, neetcodeUrl: "https://neetcode.io/problems/binary-search", difficulty: "Easy" as const, category: "Binary Search", totalAttempts: 2, daysOverdue: 1, retrievability: 0.55, lastReviewedAt: daysAgo(5) },
  { stateId: "d2", problemId: 3, title: "Group Anagrams", leetcodeNumber: 49, neetcodeUrl: "https://neetcode.io/problems/anagram-groups", difficulty: "Medium" as const, category: "Arrays & Hashing", totalAttempts: 2, daysOverdue: 1, retrievability: 0.52, lastReviewedAt: daysAgo(6) },
  { stateId: "d4", problemId: 13, title: "Valid Palindrome", leetcodeNumber: 125, neetcodeUrl: "https://neetcode.io/problems/is-palindrome", difficulty: "Easy" as const, category: "Two Pointers", totalAttempts: 2, daysOverdue: 1, retrievability: 0.61, lastReviewedAt: daysAgo(5) },
];

// New problems (unattempted) — all 134 remaining NeetCode 150 problems the demo user hasn't started
const newProblems = [
  { id: 2, leetcodeNumber: 36, title: "Valid Sudoku", neetcodeUrl: "https://neetcode.io/problems/valid-sudoku", difficulty: "Medium" as const, category: "Arrays & Hashing", blind75: false, leetcodeUrl: "https://leetcode.com/problems/valid-sudoku/" },
  { id: 8, leetcodeNumber: 271, title: "Encode and Decode Strings", neetcodeUrl: "https://neetcode.io/problems/string-encode-and-decode", difficulty: "Medium" as const, category: "Arrays & Hashing", blind75: true, leetcodeUrl: "https://leetcode.com/problems/encode-and-decode-strings/" },
  { id: 11, leetcodeNumber: 15, title: "3Sum", neetcodeUrl: "https://neetcode.io/problems/three-integer-sum", difficulty: "Medium" as const, category: "Two Pointers", blind75: true, leetcodeUrl: "https://leetcode.com/problems/3sum/" },
  { id: 14, leetcodeNumber: 167, title: "Two Sum II Input Array Is Sorted", neetcodeUrl: "https://neetcode.io/problems/two-integer-sum-ii", difficulty: "Medium" as const, category: "Two Pointers", blind75: false, leetcodeUrl: "https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/" },
  { id: 16, leetcodeNumber: 76, title: "Minimum Window Substring", neetcodeUrl: "https://neetcode.io/problems/minimum-window-with-characters", difficulty: "Hard" as const, category: "Sliding Window", blind75: true, leetcodeUrl: "https://leetcode.com/problems/minimum-window-substring/" },
  { id: 18, leetcodeNumber: 239, title: "Sliding Window Maximum", neetcodeUrl: "https://neetcode.io/problems/sliding-window-maximum", difficulty: "Hard" as const, category: "Sliding Window", blind75: false, leetcodeUrl: "https://leetcode.com/problems/sliding-window-maximum/" },
  { id: 19, leetcodeNumber: 424, title: "Longest Repeating Character Replacement", neetcodeUrl: "https://neetcode.io/problems/longest-repeating-substring-with-replacement", difficulty: "Medium" as const, category: "Sliding Window", blind75: true, leetcodeUrl: "https://leetcode.com/problems/longest-repeating-character-replacement/" },
  { id: 20, leetcodeNumber: 567, title: "Permutation In String", neetcodeUrl: "https://neetcode.io/problems/permutation-string", difficulty: "Medium" as const, category: "Sliding Window", blind75: false, leetcodeUrl: "https://leetcode.com/problems/permutation-in-string/" },
  { id: 21, leetcodeNumber: 20, title: "Valid Parentheses", neetcodeUrl: "https://neetcode.io/problems/validate-parentheses", difficulty: "Easy" as const, category: "Stack", blind75: true, leetcodeUrl: "https://leetcode.com/problems/valid-parentheses/" },
  { id: 22, leetcodeNumber: 22, title: "Generate Parentheses", neetcodeUrl: "https://neetcode.io/problems/generate-parentheses", difficulty: "Medium" as const, category: "Stack", blind75: false, leetcodeUrl: "https://leetcode.com/problems/generate-parentheses/" },
  { id: 23, leetcodeNumber: 84, title: "Largest Rectangle In Histogram", neetcodeUrl: "https://neetcode.io/problems/largest-rectangle-in-histogram", difficulty: "Hard" as const, category: "Stack", blind75: false, leetcodeUrl: "https://leetcode.com/problems/largest-rectangle-in-histogram/" },
  { id: 26, leetcodeNumber: 739, title: "Daily Temperatures", neetcodeUrl: "https://neetcode.io/problems/daily-temperatures", difficulty: "Medium" as const, category: "Stack", blind75: false, leetcodeUrl: "https://leetcode.com/problems/daily-temperatures/" },
  { id: 27, leetcodeNumber: 853, title: "Car Fleet", neetcodeUrl: "https://neetcode.io/problems/car-fleet", difficulty: "Medium" as const, category: "Stack", blind75: false, leetcodeUrl: "https://leetcode.com/problems/car-fleet/" },
  { id: 28, leetcodeNumber: 4, title: "Median of Two Sorted Arrays", neetcodeUrl: "https://neetcode.io/problems/median-of-two-sorted-arrays", difficulty: "Hard" as const, category: "Binary Search", blind75: false, leetcodeUrl: "https://leetcode.com/problems/median-of-two-sorted-arrays/" },
  { id: 29, leetcodeNumber: 33, title: "Search In Rotated Sorted Array", neetcodeUrl: "https://neetcode.io/problems/find-target-in-rotated-sorted-array", difficulty: "Medium" as const, category: "Binary Search", blind75: true, leetcodeUrl: "https://leetcode.com/problems/search-in-rotated-sorted-array/" },
  { id: 31, leetcodeNumber: 153, title: "Find Minimum In Rotated Sorted Array", neetcodeUrl: "https://neetcode.io/problems/find-minimum-in-rotated-sorted-array", difficulty: "Medium" as const, category: "Binary Search", blind75: true, leetcodeUrl: "https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/" },
  { id: 33, leetcodeNumber: 875, title: "Koko Eating Bananas", neetcodeUrl: "https://neetcode.io/problems/eating-bananas", difficulty: "Medium" as const, category: "Binary Search", blind75: false, leetcodeUrl: "https://leetcode.com/problems/koko-eating-bananas/" },
  { id: 34, leetcodeNumber: 981, title: "Time Based Key Value Store", neetcodeUrl: "https://neetcode.io/problems/time-based-key-value-store", difficulty: "Medium" as const, category: "Binary Search", blind75: false, leetcodeUrl: "https://leetcode.com/problems/time-based-key-value-store/" },
  { id: 35, leetcodeNumber: 2, title: "Add Two Numbers", neetcodeUrl: "https://neetcode.io/problems/add-two-numbers", difficulty: "Medium" as const, category: "Linked List", blind75: false, leetcodeUrl: "https://leetcode.com/problems/add-two-numbers/" },
  { id: 36, leetcodeNumber: 19, title: "Remove Nth Node From End of List", neetcodeUrl: "https://neetcode.io/problems/remove-node-from-end-of-linked-list", difficulty: "Medium" as const, category: "Linked List", blind75: true, leetcodeUrl: "https://leetcode.com/problems/remove-nth-node-from-end-of-list/" },
  { id: 37, leetcodeNumber: 21, title: "Merge Two Sorted Lists", neetcodeUrl: "https://neetcode.io/problems/merge-two-sorted-linked-lists", difficulty: "Easy" as const, category: "Linked List", blind75: true, leetcodeUrl: "https://leetcode.com/problems/merge-two-sorted-lists/" },
  { id: 38, leetcodeNumber: 23, title: "Merge K Sorted Lists", neetcodeUrl: "https://neetcode.io/problems/merge-k-sorted-linked-lists", difficulty: "Hard" as const, category: "Linked List", blind75: true, leetcodeUrl: "https://leetcode.com/problems/merge-k-sorted-lists/" },
  { id: 39, leetcodeNumber: 25, title: "Reverse Nodes In K Group", neetcodeUrl: "https://neetcode.io/problems/reverse-nodes-in-k-group", difficulty: "Hard" as const, category: "Linked List", blind75: false, leetcodeUrl: "https://leetcode.com/problems/reverse-nodes-in-k-group/" },
  { id: 40, leetcodeNumber: 138, title: "Copy List With Random Pointer", neetcodeUrl: "https://neetcode.io/problems/copy-linked-list-with-random-pointer", difficulty: "Medium" as const, category: "Linked List", blind75: false, leetcodeUrl: "https://leetcode.com/problems/copy-list-with-random-pointer/" },
  { id: 41, leetcodeNumber: 141, title: "Linked List Cycle", neetcodeUrl: "https://neetcode.io/problems/linked-list-cycle-detection", difficulty: "Easy" as const, category: "Linked List", blind75: true, leetcodeUrl: "https://leetcode.com/problems/linked-list-cycle/" },
  { id: 42, leetcodeNumber: 143, title: "Reorder List", neetcodeUrl: "https://neetcode.io/problems/reorder-linked-list", difficulty: "Medium" as const, category: "Linked List", blind75: true, leetcodeUrl: "https://leetcode.com/problems/reorder-list/" },
  { id: 43, leetcodeNumber: 146, title: "LRU Cache", neetcodeUrl: "https://neetcode.io/problems/lru-cache", difficulty: "Medium" as const, category: "Linked List", blind75: false, leetcodeUrl: "https://leetcode.com/problems/lru-cache/" },
  { id: 44, leetcodeNumber: 206, title: "Reverse Linked List", neetcodeUrl: "https://neetcode.io/problems/reverse-a-linked-list", difficulty: "Easy" as const, category: "Linked List", blind75: true, leetcodeUrl: "https://leetcode.com/problems/reverse-linked-list/" },
  { id: 45, leetcodeNumber: 287, title: "Find The Duplicate Number", neetcodeUrl: "https://neetcode.io/problems/find-duplicate-integer", difficulty: "Medium" as const, category: "Linked List", blind75: false, leetcodeUrl: "https://leetcode.com/problems/find-the-duplicate-number/" },
  { id: 46, leetcodeNumber: 98, title: "Validate Binary Search Tree", neetcodeUrl: "https://neetcode.io/problems/valid-binary-search-tree", difficulty: "Medium" as const, category: "Trees", blind75: true, leetcodeUrl: "https://leetcode.com/problems/validate-binary-search-tree/" },
  { id: 47, leetcodeNumber: 100, title: "Same Tree", neetcodeUrl: "https://neetcode.io/problems/same-binary-tree", difficulty: "Easy" as const, category: "Trees", blind75: true, leetcodeUrl: "https://leetcode.com/problems/same-tree/" },
  { id: 48, leetcodeNumber: 102, title: "Binary Tree Level Order Traversal", neetcodeUrl: "https://neetcode.io/problems/level-order-traversal-of-binary-tree", difficulty: "Medium" as const, category: "Trees", blind75: true, leetcodeUrl: "https://leetcode.com/problems/binary-tree-level-order-traversal/" },
  { id: 49, leetcodeNumber: 104, title: "Maximum Depth of Binary Tree", neetcodeUrl: "https://neetcode.io/problems/depth-of-binary-tree", difficulty: "Easy" as const, category: "Trees", blind75: true, leetcodeUrl: "https://leetcode.com/problems/maximum-depth-of-binary-tree/" },
  { id: 50, leetcodeNumber: 105, title: "Construct Binary Tree From Preorder And Inorder Traversal", neetcodeUrl: "https://neetcode.io/problems/binary-tree-from-preorder-and-inorder-traversal", difficulty: "Medium" as const, category: "Trees", blind75: true, leetcodeUrl: "https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/" },
  { id: 51, leetcodeNumber: 110, title: "Balanced Binary Tree", neetcodeUrl: "https://neetcode.io/problems/balanced-binary-tree", difficulty: "Easy" as const, category: "Trees", blind75: true, leetcodeUrl: "https://leetcode.com/problems/balanced-binary-tree/" },
  { id: 52, leetcodeNumber: 124, title: "Binary Tree Maximum Path Sum", neetcodeUrl: "https://neetcode.io/problems/binary-tree-maximum-path-sum", difficulty: "Hard" as const, category: "Trees", blind75: true, leetcodeUrl: "https://leetcode.com/problems/binary-tree-maximum-path-sum/" },
  { id: 53, leetcodeNumber: 199, title: "Binary Tree Right Side View", neetcodeUrl: "https://neetcode.io/problems/binary-tree-right-side-view", difficulty: "Medium" as const, category: "Trees", blind75: true, leetcodeUrl: "https://leetcode.com/problems/binary-tree-right-side-view/" },
  { id: 54, leetcodeNumber: 226, title: "Invert Binary Tree", neetcodeUrl: "https://neetcode.io/problems/invert-a-binary-tree", difficulty: "Easy" as const, category: "Trees", blind75: true, leetcodeUrl: "https://leetcode.com/problems/invert-binary-tree/" },
  { id: 55, leetcodeNumber: 230, title: "Kth Smallest Element In a Bst", neetcodeUrl: "https://neetcode.io/problems/kth-smallest-integer-in-bst", difficulty: "Medium" as const, category: "Trees", blind75: true, leetcodeUrl: "https://leetcode.com/problems/kth-smallest-element-in-a-bst/" },
  { id: 56, leetcodeNumber: 235, title: "Lowest Common Ancestor of a Binary Search Tree", neetcodeUrl: "https://neetcode.io/problems/lowest-common-ancestor-in-binary-search-tree", difficulty: "Medium" as const, category: "Trees", blind75: true, leetcodeUrl: "https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/" },
  { id: 57, leetcodeNumber: 297, title: "Serialize And Deserialize Binary Tree", neetcodeUrl: "https://neetcode.io/problems/serialize-and-deserialize-binary-tree", difficulty: "Hard" as const, category: "Trees", blind75: true, leetcodeUrl: "https://leetcode.com/problems/serialize-and-deserialize-binary-tree/" },
  { id: 58, leetcodeNumber: 543, title: "Diameter of Binary Tree", neetcodeUrl: "https://neetcode.io/problems/binary-tree-diameter", difficulty: "Easy" as const, category: "Trees", blind75: true, leetcodeUrl: "https://leetcode.com/problems/diameter-of-binary-tree/" },
  { id: 59, leetcodeNumber: 572, title: "Subtree of Another Tree", neetcodeUrl: "https://neetcode.io/problems/subtree-of-a-binary-tree", difficulty: "Easy" as const, category: "Trees", blind75: true, leetcodeUrl: "https://leetcode.com/problems/subtree-of-another-tree/" },
  { id: 60, leetcodeNumber: 1448, title: "Count Good Nodes In Binary Tree", neetcodeUrl: "https://neetcode.io/problems/count-good-nodes-in-binary-tree", difficulty: "Medium" as const, category: "Trees", blind75: false, leetcodeUrl: "https://leetcode.com/problems/count-good-nodes-in-binary-tree/" },
  { id: 61, leetcodeNumber: 208, title: "Implement Trie Prefix Tree", neetcodeUrl: "https://neetcode.io/problems/implement-prefix-tree", difficulty: "Medium" as const, category: "Tries", blind75: true, leetcodeUrl: "https://leetcode.com/problems/implement-trie-prefix-tree/" },
  { id: 62, leetcodeNumber: 211, title: "Design Add And Search Words Data Structure", neetcodeUrl: "https://neetcode.io/problems/design-word-search-data-structure", difficulty: "Medium" as const, category: "Tries", blind75: true, leetcodeUrl: "https://leetcode.com/problems/design-add-and-search-words-data-structure/" },
  { id: 63, leetcodeNumber: 212, title: "Word Search II", neetcodeUrl: "https://neetcode.io/problems/search-for-word-ii", difficulty: "Hard" as const, category: "Tries", blind75: true, leetcodeUrl: "https://leetcode.com/problems/word-search-ii/" },
  { id: 64, leetcodeNumber: 215, title: "Kth Largest Element In An Array", neetcodeUrl: "https://neetcode.io/problems/kth-largest-element-in-an-array", difficulty: "Medium" as const, category: "Heap / Priority Queue", blind75: false, leetcodeUrl: "https://leetcode.com/problems/kth-largest-element-in-an-array/" },
  { id: 65, leetcodeNumber: 295, title: "Find Median From Data Stream", neetcodeUrl: "https://neetcode.io/problems/find-median-in-a-data-stream", difficulty: "Hard" as const, category: "Heap / Priority Queue", blind75: true, leetcodeUrl: "https://leetcode.com/problems/find-median-from-data-stream/" },
  { id: 66, leetcodeNumber: 355, title: "Design Twitter", neetcodeUrl: "https://neetcode.io/problems/design-twitter-feed", difficulty: "Medium" as const, category: "Heap / Priority Queue", blind75: false, leetcodeUrl: "https://leetcode.com/problems/design-twitter/" },
  { id: 67, leetcodeNumber: 621, title: "Task Scheduler", neetcodeUrl: "https://neetcode.io/problems/task-scheduling", difficulty: "Medium" as const, category: "Heap / Priority Queue", blind75: false, leetcodeUrl: "https://leetcode.com/problems/task-scheduler/" },
  { id: 68, leetcodeNumber: 703, title: "Kth Largest Element In a Stream", neetcodeUrl: "https://neetcode.io/problems/kth-largest-integer-in-a-stream", difficulty: "Easy" as const, category: "Heap / Priority Queue", blind75: false, leetcodeUrl: "https://leetcode.com/problems/kth-largest-element-in-a-stream/" },
  { id: 69, leetcodeNumber: 973, title: "K Closest Points to Origin", neetcodeUrl: "https://neetcode.io/problems/k-closest-points-to-origin", difficulty: "Medium" as const, category: "Heap / Priority Queue", blind75: false, leetcodeUrl: "https://leetcode.com/problems/k-closest-points-to-origin/" },
  { id: 70, leetcodeNumber: 1046, title: "Last Stone Weight", neetcodeUrl: "https://neetcode.io/problems/last-stone-weight", difficulty: "Easy" as const, category: "Heap / Priority Queue", blind75: false, leetcodeUrl: "https://leetcode.com/problems/last-stone-weight/" },
  { id: 71, leetcodeNumber: 17, title: "Letter Combinations of a Phone Number", neetcodeUrl: "https://neetcode.io/problems/combinations-of-a-phone-number", difficulty: "Medium" as const, category: "Backtracking", blind75: true, leetcodeUrl: "https://leetcode.com/problems/letter-combinations-of-a-phone-number/" },
  { id: 72, leetcodeNumber: 39, title: "Combination Sum", neetcodeUrl: "https://neetcode.io/problems/combination-target-sum", difficulty: "Medium" as const, category: "Backtracking", blind75: true, leetcodeUrl: "https://leetcode.com/problems/combination-sum/" },
  { id: 73, leetcodeNumber: 40, title: "Combination Sum II", neetcodeUrl: "https://neetcode.io/problems/combination-sum-ii", difficulty: "Medium" as const, category: "Backtracking", blind75: false, leetcodeUrl: "https://leetcode.com/problems/combination-sum-ii/" },
  { id: 74, leetcodeNumber: 46, title: "Permutations", neetcodeUrl: "https://neetcode.io/problems/permutations", difficulty: "Medium" as const, category: "Backtracking", blind75: true, leetcodeUrl: "https://leetcode.com/problems/permutations/" },
  { id: 75, leetcodeNumber: 51, title: "N Queens", neetcodeUrl: "https://neetcode.io/problems/n-queens", difficulty: "Hard" as const, category: "Backtracking", blind75: false, leetcodeUrl: "https://leetcode.com/problems/n-queens/" },
  { id: 76, leetcodeNumber: 78, title: "Subsets", neetcodeUrl: "https://neetcode.io/problems/subsets", difficulty: "Medium" as const, category: "Backtracking", blind75: true, leetcodeUrl: "https://leetcode.com/problems/subsets/" },
  { id: 77, leetcodeNumber: 79, title: "Word Search", neetcodeUrl: "https://neetcode.io/problems/search-for-word", difficulty: "Medium" as const, category: "Backtracking", blind75: true, leetcodeUrl: "https://leetcode.com/problems/word-search/" },
  { id: 78, leetcodeNumber: 90, title: "Subsets II", neetcodeUrl: "https://neetcode.io/problems/subsets-ii", difficulty: "Medium" as const, category: "Backtracking", blind75: false, leetcodeUrl: "https://leetcode.com/problems/subsets-ii/" },
  { id: 79, leetcodeNumber: 131, title: "Palindrome Partitioning", neetcodeUrl: "https://neetcode.io/problems/palindrome-partitioning", difficulty: "Medium" as const, category: "Backtracking", blind75: false, leetcodeUrl: "https://leetcode.com/problems/palindrome-partitioning/" },
  { id: 80, leetcodeNumber: 127, title: "Word Ladder", neetcodeUrl: "https://neetcode.io/problems/word-ladder", difficulty: "Hard" as const, category: "Graphs", blind75: false, leetcodeUrl: "https://leetcode.com/problems/word-ladder/" },
  { id: 81, leetcodeNumber: 130, title: "Surrounded Regions", neetcodeUrl: "https://neetcode.io/problems/surrounded-regions", difficulty: "Medium" as const, category: "Graphs", blind75: false, leetcodeUrl: "https://leetcode.com/problems/surrounded-regions/" },
  { id: 82, leetcodeNumber: 133, title: "Clone Graph", neetcodeUrl: "https://neetcode.io/problems/clone-graph", difficulty: "Medium" as const, category: "Graphs", blind75: true, leetcodeUrl: "https://leetcode.com/problems/clone-graph/" },
  { id: 83, leetcodeNumber: 200, title: "Number of Islands", neetcodeUrl: "https://neetcode.io/problems/count-number-of-islands", difficulty: "Medium" as const, category: "Graphs", blind75: true, leetcodeUrl: "https://leetcode.com/problems/number-of-islands/" },
  { id: 84, leetcodeNumber: 207, title: "Course Schedule", neetcodeUrl: "https://neetcode.io/problems/course-schedule", difficulty: "Medium" as const, category: "Graphs", blind75: true, leetcodeUrl: "https://leetcode.com/problems/course-schedule/" },
  { id: 85, leetcodeNumber: 210, title: "Course Schedule II", neetcodeUrl: "https://neetcode.io/problems/course-schedule-ii", difficulty: "Medium" as const, category: "Graphs", blind75: false, leetcodeUrl: "https://leetcode.com/problems/course-schedule-ii/" },
  { id: 86, leetcodeNumber: 261, title: "Graph Valid Tree", neetcodeUrl: "https://neetcode.io/problems/valid-tree", difficulty: "Medium" as const, category: "Graphs", blind75: false, leetcodeUrl: "https://leetcode.com/problems/graph-valid-tree/" },
  { id: 87, leetcodeNumber: 286, title: "Walls And Gates", neetcodeUrl: "https://neetcode.io/problems/islands-and-treasure", difficulty: "Medium" as const, category: "Graphs", blind75: false, leetcodeUrl: "https://leetcode.com/problems/walls-and-gates/" },
  { id: 88, leetcodeNumber: 323, title: "Number of Connected Components In An Undirected Graph", neetcodeUrl: "https://neetcode.io/problems/count-connected-components", difficulty: "Medium" as const, category: "Graphs", blind75: false, leetcodeUrl: "https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/" },
  { id: 89, leetcodeNumber: 417, title: "Pacific Atlantic Water Flow", neetcodeUrl: "https://neetcode.io/problems/pacific-atlantic-water-flow", difficulty: "Medium" as const, category: "Graphs", blind75: true, leetcodeUrl: "https://leetcode.com/problems/pacific-atlantic-water-flow/" },
  { id: 90, leetcodeNumber: 684, title: "Redundant Connection", neetcodeUrl: "https://neetcode.io/problems/redundant-connection", difficulty: "Medium" as const, category: "Graphs", blind75: false, leetcodeUrl: "https://leetcode.com/problems/redundant-connection/" },
  { id: 91, leetcodeNumber: 695, title: "Max Area of Island", neetcodeUrl: "https://neetcode.io/problems/max-area-of-island", difficulty: "Medium" as const, category: "Graphs", blind75: false, leetcodeUrl: "https://leetcode.com/problems/max-area-of-island/" },
  { id: 92, leetcodeNumber: 994, title: "Rotting Oranges", neetcodeUrl: "https://neetcode.io/problems/rotting-fruit", difficulty: "Medium" as const, category: "Graphs", blind75: false, leetcodeUrl: "https://leetcode.com/problems/rotting-oranges/" },
  { id: 93, leetcodeNumber: 269, title: "Alien Dictionary", neetcodeUrl: "https://neetcode.io/problems/foreign-dictionary", difficulty: "Hard" as const, category: "Advanced Graphs", blind75: true, leetcodeUrl: "https://leetcode.com/problems/alien-dictionary/" },
  { id: 94, leetcodeNumber: 332, title: "Reconstruct Itinerary", neetcodeUrl: "https://neetcode.io/problems/reconstruct-flight-path", difficulty: "Hard" as const, category: "Advanced Graphs", blind75: false, leetcodeUrl: "https://leetcode.com/problems/reconstruct-itinerary/" },
  { id: 95, leetcodeNumber: 743, title: "Network Delay Time", neetcodeUrl: "https://neetcode.io/problems/network-delay-time", difficulty: "Medium" as const, category: "Advanced Graphs", blind75: false, leetcodeUrl: "https://leetcode.com/problems/network-delay-time/" },
  { id: 96, leetcodeNumber: 778, title: "Swim In Rising Water", neetcodeUrl: "https://neetcode.io/problems/swim-in-rising-water", difficulty: "Hard" as const, category: "Advanced Graphs", blind75: false, leetcodeUrl: "https://leetcode.com/problems/swim-in-rising-water/" },
  { id: 97, leetcodeNumber: 787, title: "Cheapest Flights Within K Stops", neetcodeUrl: "https://neetcode.io/problems/cheapest-flight-path", difficulty: "Medium" as const, category: "Advanced Graphs", blind75: false, leetcodeUrl: "https://leetcode.com/problems/cheapest-flights-within-k-stops/" },
  { id: 98, leetcodeNumber: 1584, title: "Min Cost to Connect All Points", neetcodeUrl: "https://neetcode.io/problems/min-cost-to-connect-points", difficulty: "Medium" as const, category: "Advanced Graphs", blind75: false, leetcodeUrl: "https://leetcode.com/problems/min-cost-to-connect-all-points/" },
  { id: 99, leetcodeNumber: 5, title: "Longest Palindromic Substring", neetcodeUrl: "https://neetcode.io/problems/longest-palindromic-substring", difficulty: "Medium" as const, category: "1-D Dynamic Programming", blind75: true, leetcodeUrl: "https://leetcode.com/problems/longest-palindromic-substring/" },
  { id: 100, leetcodeNumber: 70, title: "Climbing Stairs", neetcodeUrl: "https://neetcode.io/problems/climbing-stairs", difficulty: "Easy" as const, category: "1-D Dynamic Programming", blind75: true, leetcodeUrl: "https://leetcode.com/problems/climbing-stairs/" },
  { id: 101, leetcodeNumber: 91, title: "Decode Ways", neetcodeUrl: "https://neetcode.io/problems/decode-ways", difficulty: "Medium" as const, category: "1-D Dynamic Programming", blind75: true, leetcodeUrl: "https://leetcode.com/problems/decode-ways/" },
  { id: 102, leetcodeNumber: 139, title: "Word Break", neetcodeUrl: "https://neetcode.io/problems/word-break", difficulty: "Medium" as const, category: "1-D Dynamic Programming", blind75: true, leetcodeUrl: "https://leetcode.com/problems/word-break/" },
  { id: 103, leetcodeNumber: 152, title: "Maximum Product Subarray", neetcodeUrl: "https://neetcode.io/problems/maximum-product-subarray", difficulty: "Medium" as const, category: "1-D Dynamic Programming", blind75: true, leetcodeUrl: "https://leetcode.com/problems/maximum-product-subarray/" },
  { id: 104, leetcodeNumber: 198, title: "House Robber", neetcodeUrl: "https://neetcode.io/problems/house-robber", difficulty: "Medium" as const, category: "1-D Dynamic Programming", blind75: true, leetcodeUrl: "https://leetcode.com/problems/house-robber/" },
  { id: 105, leetcodeNumber: 213, title: "House Robber II", neetcodeUrl: "https://neetcode.io/problems/house-robber-ii", difficulty: "Medium" as const, category: "1-D Dynamic Programming", blind75: true, leetcodeUrl: "https://leetcode.com/problems/house-robber-ii/" },
  { id: 106, leetcodeNumber: 300, title: "Longest Increasing Subsequence", neetcodeUrl: "https://neetcode.io/problems/longest-increasing-subsequence", difficulty: "Medium" as const, category: "1-D Dynamic Programming", blind75: true, leetcodeUrl: "https://leetcode.com/problems/longest-increasing-subsequence/" },
  { id: 107, leetcodeNumber: 322, title: "Coin Change", neetcodeUrl: "https://neetcode.io/problems/coin-change", difficulty: "Medium" as const, category: "1-D Dynamic Programming", blind75: true, leetcodeUrl: "https://leetcode.com/problems/coin-change/" },
  { id: 108, leetcodeNumber: 416, title: "Partition Equal Subset Sum", neetcodeUrl: "https://neetcode.io/problems/partition-equal-subset-sum", difficulty: "Medium" as const, category: "1-D Dynamic Programming", blind75: false, leetcodeUrl: "https://leetcode.com/problems/partition-equal-subset-sum/" },
  { id: 109, leetcodeNumber: 647, title: "Palindromic Substrings", neetcodeUrl: "https://neetcode.io/problems/palindromic-substrings", difficulty: "Medium" as const, category: "1-D Dynamic Programming", blind75: true, leetcodeUrl: "https://leetcode.com/problems/palindromic-substrings/" },
  { id: 110, leetcodeNumber: 746, title: "Min Cost Climbing Stairs", neetcodeUrl: "https://neetcode.io/problems/min-cost-climbing-stairs", difficulty: "Easy" as const, category: "1-D Dynamic Programming", blind75: false, leetcodeUrl: "https://leetcode.com/problems/min-cost-climbing-stairs/" },
  { id: 111, leetcodeNumber: 10, title: "Regular Expression Matching", neetcodeUrl: "https://neetcode.io/problems/regular-expression-matching", difficulty: "Hard" as const, category: "2-D Dynamic Programming", blind75: false, leetcodeUrl: "https://leetcode.com/problems/regular-expression-matching/" },
  { id: 112, leetcodeNumber: 62, title: "Unique Paths", neetcodeUrl: "https://neetcode.io/problems/count-paths", difficulty: "Medium" as const, category: "2-D Dynamic Programming", blind75: true, leetcodeUrl: "https://leetcode.com/problems/unique-paths/" },
  { id: 113, leetcodeNumber: 72, title: "Edit Distance", neetcodeUrl: "https://neetcode.io/problems/edit-distance", difficulty: "Medium" as const, category: "2-D Dynamic Programming", blind75: false, leetcodeUrl: "https://leetcode.com/problems/edit-distance/" },
  { id: 114, leetcodeNumber: 97, title: "Interleaving String", neetcodeUrl: "https://neetcode.io/problems/interleaving-string", difficulty: "Medium" as const, category: "2-D Dynamic Programming", blind75: false, leetcodeUrl: "https://leetcode.com/problems/interleaving-string/" },
  { id: 115, leetcodeNumber: 115, title: "Distinct Subsequences", neetcodeUrl: "https://neetcode.io/problems/distinct-subsequences", difficulty: "Hard" as const, category: "2-D Dynamic Programming", blind75: false, leetcodeUrl: "https://leetcode.com/problems/distinct-subsequences/" },
  { id: 116, leetcodeNumber: 309, title: "Best Time to Buy And Sell Stock With Cooldown", neetcodeUrl: "https://neetcode.io/problems/buy-and-sell-stock-with-cooldown", difficulty: "Medium" as const, category: "2-D Dynamic Programming", blind75: false, leetcodeUrl: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/" },
  { id: 117, leetcodeNumber: 312, title: "Burst Balloons", neetcodeUrl: "https://neetcode.io/problems/burst-balloons", difficulty: "Hard" as const, category: "2-D Dynamic Programming", blind75: false, leetcodeUrl: "https://leetcode.com/problems/burst-balloons/" },
  { id: 118, leetcodeNumber: 329, title: "Longest Increasing Path In a Matrix", neetcodeUrl: "https://neetcode.io/problems/longest-increasing-path-in-matrix", difficulty: "Hard" as const, category: "2-D Dynamic Programming", blind75: false, leetcodeUrl: "https://leetcode.com/problems/longest-increasing-path-in-a-matrix/" },
  { id: 119, leetcodeNumber: 494, title: "Target Sum", neetcodeUrl: "https://neetcode.io/problems/target-sum", difficulty: "Medium" as const, category: "2-D Dynamic Programming", blind75: false, leetcodeUrl: "https://leetcode.com/problems/target-sum/" },
  { id: 120, leetcodeNumber: 518, title: "Coin Change II", neetcodeUrl: "https://neetcode.io/problems/coin-change-ii", difficulty: "Medium" as const, category: "2-D Dynamic Programming", blind75: false, leetcodeUrl: "https://leetcode.com/problems/coin-change-ii/" },
  { id: 121, leetcodeNumber: 1143, title: "Longest Common Subsequence", neetcodeUrl: "https://neetcode.io/problems/longest-common-subsequence", difficulty: "Medium" as const, category: "2-D Dynamic Programming", blind75: true, leetcodeUrl: "https://leetcode.com/problems/longest-common-subsequence/" },
  { id: 122, leetcodeNumber: 45, title: "Jump Game II", neetcodeUrl: "https://neetcode.io/problems/jump-game-ii", difficulty: "Medium" as const, category: "Greedy", blind75: false, leetcodeUrl: "https://leetcode.com/problems/jump-game-ii/" },
  { id: 123, leetcodeNumber: 53, title: "Maximum Subarray", neetcodeUrl: "https://neetcode.io/problems/maximum-subarray", difficulty: "Medium" as const, category: "Greedy", blind75: true, leetcodeUrl: "https://leetcode.com/problems/maximum-subarray/" },
  { id: 124, leetcodeNumber: 55, title: "Jump Game", neetcodeUrl: "https://neetcode.io/problems/jump-game", difficulty: "Medium" as const, category: "Greedy", blind75: true, leetcodeUrl: "https://leetcode.com/problems/jump-game/" },
  { id: 125, leetcodeNumber: 134, title: "Gas Station", neetcodeUrl: "https://neetcode.io/problems/gas-station", difficulty: "Medium" as const, category: "Greedy", blind75: false, leetcodeUrl: "https://leetcode.com/problems/gas-station/" },
  { id: 126, leetcodeNumber: 678, title: "Valid Parenthesis String", neetcodeUrl: "https://neetcode.io/problems/valid-parenthesis-string", difficulty: "Medium" as const, category: "Greedy", blind75: false, leetcodeUrl: "https://leetcode.com/problems/valid-parenthesis-string/" },
  { id: 127, leetcodeNumber: 763, title: "Partition Labels", neetcodeUrl: "https://neetcode.io/problems/partition-labels", difficulty: "Medium" as const, category: "Greedy", blind75: false, leetcodeUrl: "https://leetcode.com/problems/partition-labels/" },
  { id: 128, leetcodeNumber: 846, title: "Hand of Straights", neetcodeUrl: "https://neetcode.io/problems/hand-of-straights", difficulty: "Medium" as const, category: "Greedy", blind75: false, leetcodeUrl: "https://leetcode.com/problems/hand-of-straights/" },
  { id: 129, leetcodeNumber: 1899, title: "Merge Triplets to Form Target Triplet", neetcodeUrl: "https://neetcode.io/problems/merge-triplets-to-form-target-triplet", difficulty: "Medium" as const, category: "Greedy", blind75: false, leetcodeUrl: "https://leetcode.com/problems/merge-triplets-to-form-target-triplet/" },
  { id: 130, leetcodeNumber: 56, title: "Merge Intervals", neetcodeUrl: "https://neetcode.io/problems/merge-intervals", difficulty: "Medium" as const, category: "Intervals", blind75: true, leetcodeUrl: "https://leetcode.com/problems/merge-intervals/" },
  { id: 131, leetcodeNumber: 57, title: "Insert Interval", neetcodeUrl: "https://neetcode.io/problems/insert-new-interval", difficulty: "Medium" as const, category: "Intervals", blind75: true, leetcodeUrl: "https://leetcode.com/problems/insert-interval/" },
  { id: 132, leetcodeNumber: 252, title: "Meeting Rooms", neetcodeUrl: "https://neetcode.io/problems/meeting-schedule", difficulty: "Easy" as const, category: "Intervals", blind75: false, leetcodeUrl: "https://leetcode.com/problems/meeting-rooms/" },
  { id: 133, leetcodeNumber: 253, title: "Meeting Rooms II", neetcodeUrl: "https://neetcode.io/problems/meeting-schedule-ii", difficulty: "Medium" as const, category: "Intervals", blind75: false, leetcodeUrl: "https://leetcode.com/problems/meeting-rooms-ii/" },
  { id: 134, leetcodeNumber: 435, title: "Non Overlapping Intervals", neetcodeUrl: "https://neetcode.io/problems/non-overlapping-intervals", difficulty: "Medium" as const, category: "Intervals", blind75: true, leetcodeUrl: "https://leetcode.com/problems/non-overlapping-intervals/" },
  { id: 135, leetcodeNumber: 1851, title: "Minimum Interval to Include Each Query", neetcodeUrl: "https://neetcode.io/problems/minimum-interval-including-query", difficulty: "Hard" as const, category: "Intervals", blind75: false, leetcodeUrl: "https://leetcode.com/problems/minimum-interval-to-include-each-query/" },
  { id: 136, leetcodeNumber: 43, title: "Multiply Strings", neetcodeUrl: "https://neetcode.io/problems/multiply-strings", difficulty: "Medium" as const, category: "Math & Geometry", blind75: false, leetcodeUrl: "https://leetcode.com/problems/multiply-strings/" },
  { id: 137, leetcodeNumber: 48, title: "Rotate Image", neetcodeUrl: "https://neetcode.io/problems/rotate-matrix", difficulty: "Medium" as const, category: "Math & Geometry", blind75: true, leetcodeUrl: "https://leetcode.com/problems/rotate-image/" },
  { id: 138, leetcodeNumber: 50, title: "Pow(x, n)", neetcodeUrl: "https://neetcode.io/problems/pow-x-n", difficulty: "Medium" as const, category: "Math & Geometry", blind75: false, leetcodeUrl: "https://leetcode.com/problems/powx-n/" },
  { id: 139, leetcodeNumber: 54, title: "Spiral Matrix", neetcodeUrl: "https://neetcode.io/problems/spiral-matrix", difficulty: "Medium" as const, category: "Math & Geometry", blind75: true, leetcodeUrl: "https://leetcode.com/problems/spiral-matrix/" },
  { id: 140, leetcodeNumber: 66, title: "Plus One", neetcodeUrl: "https://neetcode.io/problems/plus-one", difficulty: "Easy" as const, category: "Math & Geometry", blind75: false, leetcodeUrl: "https://leetcode.com/problems/plus-one/" },
  { id: 141, leetcodeNumber: 73, title: "Set Matrix Zeroes", neetcodeUrl: "https://neetcode.io/problems/zero-matrix", difficulty: "Medium" as const, category: "Math & Geometry", blind75: true, leetcodeUrl: "https://leetcode.com/problems/set-matrix-zeroes/" },
  { id: 142, leetcodeNumber: 202, title: "Happy Number", neetcodeUrl: "https://neetcode.io/problems/happy-number", difficulty: "Easy" as const, category: "Math & Geometry", blind75: false, leetcodeUrl: "https://leetcode.com/problems/happy-number/" },
  { id: 143, leetcodeNumber: 2013, title: "Detect Squares", neetcodeUrl: "https://neetcode.io/problems/detect-squares", difficulty: "Medium" as const, category: "Math & Geometry", blind75: false, leetcodeUrl: "https://leetcode.com/problems/detect-squares/" },
  { id: 144, leetcodeNumber: 7, title: "Reverse Integer", neetcodeUrl: "https://neetcode.io/problems/reverse-integer", difficulty: "Medium" as const, category: "Bit Manipulation", blind75: false, leetcodeUrl: "https://leetcode.com/problems/reverse-integer/" },
  { id: 145, leetcodeNumber: 136, title: "Single Number", neetcodeUrl: "https://neetcode.io/problems/single-number", difficulty: "Easy" as const, category: "Bit Manipulation", blind75: true, leetcodeUrl: "https://leetcode.com/problems/single-number/" },
  { id: 146, leetcodeNumber: 190, title: "Reverse Bits", neetcodeUrl: "https://neetcode.io/problems/reverse-bits", difficulty: "Easy" as const, category: "Bit Manipulation", blind75: true, leetcodeUrl: "https://leetcode.com/problems/reverse-bits/" },
  { id: 147, leetcodeNumber: 191, title: "Number of 1 Bits", neetcodeUrl: "https://neetcode.io/problems/number-of-one-bits", difficulty: "Easy" as const, category: "Bit Manipulation", blind75: true, leetcodeUrl: "https://leetcode.com/problems/number-of-1-bits/" },
  { id: 148, leetcodeNumber: 268, title: "Missing Number", neetcodeUrl: "https://neetcode.io/problems/missing-number", difficulty: "Easy" as const, category: "Bit Manipulation", blind75: true, leetcodeUrl: "https://leetcode.com/problems/missing-number/" },
  { id: 149, leetcodeNumber: 338, title: "Counting Bits", neetcodeUrl: "https://neetcode.io/problems/counting-bits", difficulty: "Easy" as const, category: "Bit Manipulation", blind75: false, leetcodeUrl: "https://leetcode.com/problems/counting-bits/" },
  { id: 150, leetcodeNumber: 371, title: "Sum of Two Integers", neetcodeUrl: "https://neetcode.io/problems/sum-of-two-integers", difficulty: "Medium" as const, category: "Bit Manipulation", blind75: true, leetcodeUrl: "https://leetcode.com/problems/sum-of-two-integers/" },
];

// Completed problems (16 problems, correct DB ids from problems.json)
// A&H: 7/9, Two Pointers: 3/5, Sliding Window: 2/6, Stack: 2/7, Binary Search: 2/7
// Non-queue items reviewed in last 3 days (streak window). Queue items reviewed 5-12 days ago.
const completedProblems = [
  { problemId: 1,  title: "Two Sum",                                  leetcodeNumber: 1,   difficulty: "Easy"   as const, category: "Arrays & Hashing",  totalAttempts: 3, retrievability: 0.45, stability: 12, lastReviewedAt: daysAgo(8),  daysUntilReview: null, isDue: true,  bestQuality: "optimal" },
  { problemId: 5,  title: "Contains Duplicate",                       leetcodeNumber: 217, difficulty: "Easy"   as const, category: "Arrays & Hashing",  totalAttempts: 3, retrievability: 0.99, stability: 28, lastReviewedAt: daysAgo(0),  daysUntilReview: 28,   isDue: false, bestQuality: "optimal" },
  { problemId: 7,  title: "Valid Anagram",                            leetcodeNumber: 242, difficulty: "Easy"   as const, category: "Arrays & Hashing",  totalAttempts: 4, retrievability: 0.98, stability: 45, lastReviewedAt: daysAgo(1),  daysUntilReview: 44,   isDue: false, bestQuality: "optimal" },
  { problemId: 3,  title: "Group Anagrams",                           leetcodeNumber: 49,  difficulty: "Medium" as const, category: "Arrays & Hashing",  totalAttempts: 2, retrievability: 0.52, stability: 8,  lastReviewedAt: daysAgo(6),  daysUntilReview: null, isDue: true,  bestQuality: "optimal" },
  { problemId: 9,  title: "Top K Frequent Elements",                  leetcodeNumber: 347, difficulty: "Medium" as const, category: "Arrays & Hashing",  totalAttempts: 2, retrievability: 0.97, stability: 15, lastReviewedAt: daysAgo(1),  daysUntilReview: 14,   isDue: false, bestQuality: "optimal" },
  { problemId: 6,  title: "Product of Array Except Self",             leetcodeNumber: 238, difficulty: "Medium" as const, category: "Arrays & Hashing",  totalAttempts: 2, retrievability: 0.95, stability: 11, lastReviewedAt: daysAgo(2),  daysUntilReview: 9,    isDue: false, bestQuality: "optimal" },
  { problemId: 4,  title: "Longest Consecutive Sequence",             leetcodeNumber: 128, difficulty: "Medium" as const, category: "Arrays & Hashing",  totalAttempts: 2, retrievability: 0.97, stability: 14, lastReviewedAt: daysAgo(1),  daysUntilReview: 13,   isDue: false, bestQuality: "optimal" },
  { problemId: 10, title: "Container With Most Water",                leetcodeNumber: 11,  difficulty: "Medium" as const, category: "Two Pointers",       totalAttempts: 2, retrievability: 0.38, stability: 7,  lastReviewedAt: daysAgo(10), daysUntilReview: null, isDue: true,  bestQuality: "brute_force" },
  { problemId: 12, title: "Trapping Rain Water",                      leetcodeNumber: 42,  difficulty: "Hard"   as const, category: "Two Pointers",       totalAttempts: 3, retrievability: 0.22, stability: 5,  lastReviewedAt: daysAgo(12), daysUntilReview: null, isDue: true,  bestQuality: "brute_force" },
  { problemId: 13, title: "Valid Palindrome",                         leetcodeNumber: 125, difficulty: "Easy"   as const, category: "Two Pointers",       totalAttempts: 2, retrievability: 0.61, stability: 9,  lastReviewedAt: daysAgo(5),  daysUntilReview: null, isDue: true,  bestQuality: "optimal" },
  { problemId: 15, title: "Longest Substring Without Repeating Characters", leetcodeNumber: 3, difficulty: "Medium" as const, category: "Sliding Window", totalAttempts: 2, retrievability: 0.94, stability: 9,  lastReviewedAt: daysAgo(2),  daysUntilReview: 7,    isDue: false, bestQuality: "optimal" },
  { problemId: 17, title: "Best Time to Buy And Sell Stock",          leetcodeNumber: 121, difficulty: "Easy"   as const, category: "Sliding Window",    totalAttempts: 3, retrievability: 0.99, stability: 22, lastReviewedAt: daysAgo(0),  daysUntilReview: 22,   isDue: false, bestQuality: "optimal" },
  { problemId: 24, title: "Evaluate Reverse Polish Notation",         leetcodeNumber: 150, difficulty: "Medium" as const, category: "Stack",             totalAttempts: 1, retrievability: 0.48, stability: 6,  lastReviewedAt: daysAgo(7),  daysUntilReview: null, isDue: true,  bestQuality: "optimal" },
  { problemId: 25, title: "Min Stack",                                leetcodeNumber: 155, difficulty: "Medium" as const, category: "Stack",             totalAttempts: 1, retrievability: 0.31, stability: 4,  lastReviewedAt: daysAgo(11), daysUntilReview: null, isDue: true,  bestQuality: "optimal" },
  { problemId: 30, title: "Search a 2D Matrix",                       leetcodeNumber: 74,  difficulty: "Medium" as const, category: "Binary Search",     totalAttempts: 1, retrievability: 0.95, stability: 10, lastReviewedAt: daysAgo(2),  daysUntilReview: 8,    isDue: false, bestQuality: "optimal" },
  { problemId: 32, title: "Binary Search",                            leetcodeNumber: 704, difficulty: "Easy"   as const, category: "Binary Search",     totalAttempts: 2, retrievability: 0.55, stability: 8,  lastReviewedAt: daysAgo(5),  daysUntilReview: null, isDue: true,  bestQuality: "optimal" },
];

// Activity history (14 days)
// Index 0 = today, 13 = 13 days ago.
// Streak of 4: days 0-3 non-zero, day 4 = 0.
// Best streak of 6: days 5-10 non-zero.
const attemptHistory = Array.from({ length: 14 }, (_, i) => {
  const idx = 13 - i;
  const counts    = [2, 3, 3, 4, 0, 5, 3, 4, 6, 3, 2, 0, 4, 0];
  const newCounts = [0, 0, 1, 0, 0, 3, 1, 2, 3, 1, 1, 0, 2, 0];
  const c = counts[idx] ?? 0;
  const n = newCounts[idx] ?? 0;
  return { date: dateStr(idx), count: c, newCount: n, reviewCount: c - n };
});

const fullAttemptHistory = [...attemptHistory];

// Category stats
const categoryStats = [
  { category: "Arrays & Hashing", total: 9, attempted: 7, avgRetention: 0.72 },
  { category: "Two Pointers", total: 5, attempted: 3, avgRetention: 0.40 },
  { category: "Sliding Window", total: 6, attempted: 2, avgRetention: 0.70 },
  { category: "Stack", total: 7, attempted: 2, avgRetention: 0.40 },
  { category: "Binary Search", total: 7, attempted: 2, avgRetention: 0.61 },
  { category: "Linked List", total: 11, attempted: 0, avgRetention: 0 },
  { category: "Trees", total: 15, attempted: 0, avgRetention: 0 },
  { category: "Tries", total: 3, attempted: 0, avgRetention: 0 },
  { category: "Heap / Priority Queue", total: 7, attempted: 0, avgRetention: 0 },
  { category: "Backtracking", total: 9, attempted: 0, avgRetention: 0 },
  { category: "Graphs", total: 13, attempted: 0, avgRetention: 0 },
  { category: "Advanced Graphs", total: 6, attempted: 0, avgRetention: 0 },
  { category: "1-D Dynamic Programming", total: 12, attempted: 0, avgRetention: 0 },
  { category: "2-D Dynamic Programming", total: 11, attempted: 0, avgRetention: 0 },
  { category: "Greedy", total: 8, attempted: 0, avgRetention: 0 },
  { category: "Intervals", total: 6, attempted: 0, avgRetention: 0 },
  { category: "Math & Geometry", total: 8, attempted: 0, avgRetention: 0 },
  { category: "Bit Manipulation", total: 7, attempted: 0, avgRetention: 0 },
];

const difficultyBreakdown = [
  { difficulty: "Easy", count: 28, attempted: 6 },
  { difficulty: "Medium", count: 101, attempted: 8 },
  { difficulty: "Hard", count: 21, attempted: 1 },
];

const masteryList = [
  { problemId: 7, title: "Valid Anagram", leetcodeNumber: 242, stability: 45, category: "Arrays & Hashing" },
];

const learningList = [
  { problemId: 5,  title: "Contains Duplicate",                        leetcodeNumber: 217, stability: 28, category: "Arrays & Hashing" },
  { problemId: 17, title: "Best Time to Buy And Sell Stock",           leetcodeNumber: 121, stability: 22, category: "Sliding Window" },
  { problemId: 9,  title: "Top K Frequent Elements",                   leetcodeNumber: 347, stability: 15, category: "Arrays & Hashing" },
  { problemId: 4,  title: "Longest Consecutive Sequence",              leetcodeNumber: 128, stability: 14, category: "Arrays & Hashing" },
  { problemId: 1,  title: "Two Sum",                                   leetcodeNumber: 1,   stability: 12, category: "Arrays & Hashing" },
  { problemId: 6,  title: "Product of Array Except Self",              leetcodeNumber: 238, stability: 11, category: "Arrays & Hashing" },
  { problemId: 30, title: "Search a 2D Matrix",                        leetcodeNumber: 74,  stability: 10, category: "Binary Search" },
  { problemId: 15, title: "Longest Substring Without Repeating Characters", leetcodeNumber: 3, stability: 9, category: "Sliding Window" },
  { problemId: 13, title: "Valid Palindrome",                          leetcodeNumber: 125, stability: 9,  category: "Two Pointers" },
  { problemId: 3,  title: "Group Anagrams",                            leetcodeNumber: 49,  stability: 8,  category: "Arrays & Hashing" },
  { problemId: 32, title: "Binary Search",                             leetcodeNumber: 704, stability: 8,  category: "Binary Search" },
  { problemId: 10, title: "Container With Most Water",                 leetcodeNumber: 11,  stability: 7,  category: "Two Pointers" },
  { problemId: 24, title: "Evaluate Reverse Polish Notation",          leetcodeNumber: 150, stability: 6,  category: "Stack" },
  { problemId: 12, title: "Trapping Rain Water",                       leetcodeNumber: 42,  stability: 5,  category: "Two Pointers" },
  { problemId: 25, title: "Min Stack",                                 leetcodeNumber: 155, stability: 4,  category: "Stack" },
];

// Import problems (subset for demo — not interactive anyway)
const importProblems = [
  { id: 1, title: "Two Sum", leetcodeNumber: 1, difficulty: "Easy" as const, category: "Arrays & Hashing" },
];

// Demo pending GitHub submissions (problemId matches DB ids from problems.json)
const pendingSubmissions = [
  {
    id: "demo-pending-1",
    problemId: 29,
    problemTitle: "Search In Rotated Sorted Array",
    leetcodeNumber: 33,
    difficulty: "Medium" as const,
    category: "Binary Search",
    isReview: false,
    detectedAt: daysAgo(0),
  },
  {
    id: "demo-pending-2",
    problemId: 1,
    problemTitle: "Two Sum",
    leetcodeNumber: 1,
    difficulty: "Easy" as const,
    category: "Arrays & Hashing",
    isReview: true,
    detectedAt: daysAgo(0),
  },
];

export const DEMO_DASHBOARD_DATA = {
  reviewQueue,
  newProblems,
  completedProblems,
  totalProblems: 150,
  attemptedCount: 16,
  retainedCount: 9,
  readiness: { score: 28, tier: "D" as const },
  readinessBreakdown: { coverage: 0.10, retention: 0.60, categoryBalance: 0.22, consistency: 0.71 },
  currentStreak: 4,
  bestStreak: 6,
  avgPerDay: 2.9,
  avgNewPerDay: 1.1,
  avgReviewPerDay: 1.8,
  overallPerDay: 2.4,
  overallNewPerDay: 0.8,
  overallReviewPerDay: 1.6,
  categoryStats,
  difficultyBreakdown,
  attemptHistory,
  fullAttemptHistory,
  totalSolveMinutes: 320,
  totalStudyMinutes: 180,
  avgSolveMinutes: 18,
  avgConfidence: 3.2,
  masteredCount: 1,
  learningCount: 15,
  masteryList,
  learningList,
  importProblems,
  importAttemptedIds: completedProblems.map(p => p.problemId),
  importTodayAttemptedIds: [],
  pendingSubmissions,
};

/* ── Demo data for Activity page ── */

export const DEMO_ACTIVITY_DATA = {
  day: {
    date: dateStr(0),
    range: "day" as const,
    summary: {
      total: 2,
      newCount: 0,
      reviewCount: 2,
      solvedCount: 2,
      totalTime: 18,
      avgConfidence: 4.5,
    },
    items: [
      { attemptId: "demo-a1", problemId: 5,  title: "Contains Duplicate",  leetcodeNumber: 217, difficulty: "Easy" as const, category: "Arrays & Hashing", solvedIndependently: "YES", solutionQuality: "OPTIMAL", confidence: 5, solveTimeMinutes: 3,  studyTimeMinutes: null, timeCorrect: true, spaceCorrect: true, createdAt: daysAgo(0), isNew: false },
      { attemptId: "demo-a2", problemId: 17, title: "Best Time to Buy And Sell Stock", leetcodeNumber: 121, difficulty: "Easy" as const, category: "Sliding Window", solvedIndependently: "YES", solutionQuality: "OPTIMAL", confidence: 4, solveTimeMinutes: 15, studyTimeMinutes: null, timeCorrect: true, spaceCorrect: true, createdAt: daysAgo(0), isNew: false },
    ],
  },
  week: {
    date: dateStr(0),
    range: "week" as const,
    summary: {
      total: 20,
      newCount: 5,
      reviewCount: 15,
      solvedCount: 18,
      totalTime: 210,
      avgConfidence: 4.0,
    },
    items: [
      // Day -6: 3 items (1 new + 2 reviews)
      { attemptId: "demo-w0a", problemId: 5,  title: "Contains Duplicate",               leetcodeNumber: 217, difficulty: "Easy"   as const, category: "Arrays & Hashing", solvedIndependently: "YES",     solutionQuality: "OPTIMAL",     confidence: 4, solveTimeMinutes: 5,  studyTimeMinutes: null, timeCorrect: true,  spaceCorrect: true,  createdAt: daysAgo(6), isNew: true  },
      { attemptId: "demo-w0b", problemId: 3,  title: "Group Anagrams",                   leetcodeNumber: 49,  difficulty: "Medium" as const, category: "Arrays & Hashing", solvedIndependently: "PARTIAL", solutionQuality: "BRUTE_FORCE", confidence: 3, solveTimeMinutes: 20, studyTimeMinutes: null, timeCorrect: false, spaceCorrect: false, createdAt: daysAgo(6), isNew: false },
      { attemptId: "demo-w0c", problemId: 7,  title: "Valid Anagram",                    leetcodeNumber: 242, difficulty: "Easy"   as const, category: "Arrays & Hashing", solvedIndependently: "YES",     solutionQuality: "OPTIMAL",     confidence: 5, solveTimeMinutes: 4,  studyTimeMinutes: null, timeCorrect: true,  spaceCorrect: true,  createdAt: daysAgo(6), isNew: false },
      // Day -5: 5 items (3 new + 2 reviews)
      { attemptId: "demo-w1a", problemId: 6,  title: "Product of Array Except Self",     leetcodeNumber: 238, difficulty: "Medium" as const, category: "Arrays & Hashing", solvedIndependently: "YES",     solutionQuality: "OPTIMAL",     confidence: 3, solveTimeMinutes: 15, studyTimeMinutes: null, timeCorrect: true,  spaceCorrect: true,  createdAt: daysAgo(5), isNew: true  },
      { attemptId: "demo-w1b", problemId: 9,  title: "Top K Frequent Elements",          leetcodeNumber: 347, difficulty: "Medium" as const, category: "Arrays & Hashing", solvedIndependently: "YES",     solutionQuality: "OPTIMAL",     confidence: 3, solveTimeMinutes: 15, studyTimeMinutes: null, timeCorrect: true,  spaceCorrect: false, createdAt: daysAgo(5), isNew: true  },
      { attemptId: "demo-w1c", problemId: 4,  title: "Longest Consecutive Sequence",     leetcodeNumber: 128, difficulty: "Medium" as const, category: "Arrays & Hashing", solvedIndependently: "YES",     solutionQuality: "OPTIMAL",     confidence: 3, solveTimeMinutes: 12, studyTimeMinutes: null, timeCorrect: true,  spaceCorrect: true,  createdAt: daysAgo(5), isNew: true  },
      { attemptId: "demo-w1d", problemId: 13, title: "Valid Palindrome",                 leetcodeNumber: 125, difficulty: "Easy"   as const, category: "Two Pointers",      solvedIndependently: "YES",     solutionQuality: "OPTIMAL",     confidence: 4, solveTimeMinutes: 8,  studyTimeMinutes: null, timeCorrect: true,  spaceCorrect: true,  createdAt: daysAgo(5), isNew: false },
      { attemptId: "demo-w1e", problemId: 32, title: "Binary Search",                    leetcodeNumber: 704, difficulty: "Easy"   as const, category: "Binary Search",    solvedIndependently: "YES",     solutionQuality: "OPTIMAL",     confidence: 5, solveTimeMinutes: 5,  studyTimeMinutes: null, timeCorrect: true,  spaceCorrect: true,  createdAt: daysAgo(5), isNew: false },
      // Day -4: 0 attempts (break)
      // Day -3: 4 items (0 new + 4 reviews)
      { attemptId: "demo-w2a", problemId: 5,  title: "Contains Duplicate",               leetcodeNumber: 217, difficulty: "Easy"   as const, category: "Arrays & Hashing", solvedIndependently: "YES",     solutionQuality: "OPTIMAL",     confidence: 5, solveTimeMinutes: 3,  studyTimeMinutes: null, timeCorrect: true,  spaceCorrect: true,  createdAt: daysAgo(3), isNew: false },
      { attemptId: "demo-w2b", problemId: 7,  title: "Valid Anagram",                    leetcodeNumber: 242, difficulty: "Easy"   as const, category: "Arrays & Hashing", solvedIndependently: "YES",     solutionQuality: "OPTIMAL",     confidence: 5, solveTimeMinutes: 4,  studyTimeMinutes: null, timeCorrect: true,  spaceCorrect: true,  createdAt: daysAgo(3), isNew: false },
      { attemptId: "demo-w2c", problemId: 17, title: "Best Time to Buy And Sell Stock",  leetcodeNumber: 121, difficulty: "Easy"   as const, category: "Sliding Window",    solvedIndependently: "YES",     solutionQuality: "OPTIMAL",     confidence: 4, solveTimeMinutes: 8,  studyTimeMinutes: null, timeCorrect: true,  spaceCorrect: true,  createdAt: daysAgo(3), isNew: false },
      { attemptId: "demo-w2d", problemId: 15, title: "Longest Substring Without Repeating Characters", leetcodeNumber: 3, difficulty: "Medium" as const, category: "Sliding Window", solvedIndependently: "YES", solutionQuality: "OPTIMAL", confidence: 3, solveTimeMinutes: 18, studyTimeMinutes: null, timeCorrect: true, spaceCorrect: true, createdAt: daysAgo(3), isNew: false },
      // Day -2: 3 items (1 new + 2 reviews)
      { attemptId: "demo-w3a", problemId: 6,  title: "Product of Array Except Self",     leetcodeNumber: 238, difficulty: "Medium" as const, category: "Arrays & Hashing", solvedIndependently: "YES",     solutionQuality: "OPTIMAL",     confidence: 4, solveTimeMinutes: 10, studyTimeMinutes: null, timeCorrect: true,  spaceCorrect: true,  createdAt: daysAgo(2), isNew: false },
      { attemptId: "demo-w3b", problemId: 15, title: "Longest Substring Without Repeating Characters", leetcodeNumber: 3, difficulty: "Medium" as const, category: "Sliding Window", solvedIndependently: "YES", solutionQuality: "OPTIMAL", confidence: 4, solveTimeMinutes: 12, studyTimeMinutes: null, timeCorrect: true, spaceCorrect: true, createdAt: daysAgo(2), isNew: false },
      { attemptId: "demo-w3c", problemId: 30, title: "Search a 2D Matrix",               leetcodeNumber: 74,  difficulty: "Medium" as const, category: "Binary Search",    solvedIndependently: "YES",     solutionQuality: "OPTIMAL",     confidence: 4, solveTimeMinutes: 10, studyTimeMinutes: null, timeCorrect: true,  spaceCorrect: true,  createdAt: daysAgo(2), isNew: true  },
      // Day -1: 3 items (0 new + 3 reviews)
      { attemptId: "demo-w4a", problemId: 7,  title: "Valid Anagram",                    leetcodeNumber: 242, difficulty: "Easy"   as const, category: "Arrays & Hashing", solvedIndependently: "YES",     solutionQuality: "OPTIMAL",     confidence: 5, solveTimeMinutes: 4,  studyTimeMinutes: null, timeCorrect: true,  spaceCorrect: true,  createdAt: daysAgo(1), isNew: false },
      { attemptId: "demo-w4b", problemId: 9,  title: "Top K Frequent Elements",          leetcodeNumber: 347, difficulty: "Medium" as const, category: "Arrays & Hashing", solvedIndependently: "YES",     solutionQuality: "OPTIMAL",     confidence: 4, solveTimeMinutes: 12, studyTimeMinutes: null, timeCorrect: true,  spaceCorrect: true,  createdAt: daysAgo(1), isNew: false },
      { attemptId: "demo-w4c", problemId: 4,  title: "Longest Consecutive Sequence",     leetcodeNumber: 128, difficulty: "Medium" as const, category: "Arrays & Hashing", solvedIndependently: "YES",     solutionQuality: "OPTIMAL",     confidence: 4, solveTimeMinutes: 8,  studyTimeMinutes: null, timeCorrect: true,  spaceCorrect: true,  createdAt: daysAgo(1), isNew: false },
      // Today: 2 items (0 new + 2 reviews)
      { attemptId: "demo-a1", problemId: 5,  title: "Contains Duplicate",  leetcodeNumber: 217, difficulty: "Easy" as const, category: "Arrays & Hashing", solvedIndependently: "YES", solutionQuality: "OPTIMAL", confidence: 5, solveTimeMinutes: 3,  studyTimeMinutes: null, timeCorrect: true, spaceCorrect: true, createdAt: daysAgo(0), isNew: false },
      { attemptId: "demo-a2", problemId: 17, title: "Best Time to Buy And Sell Stock", leetcodeNumber: 121, difficulty: "Easy" as const, category: "Sliding Window", solvedIndependently: "YES", solutionQuality: "OPTIMAL", confidence: 4, solveTimeMinutes: 15, studyTimeMinutes: null, timeCorrect: true, spaceCorrect: true, createdAt: daysAgo(0), isNew: false },
    ],
  },
};

/* ── Demo data for Review page ── */

export const DEMO_REVIEW_QUEUE = [
  { stateId: "d8", problemId: 12, title: "Trapping Rain Water",              leetcodeNumber: 42,  difficulty: "Hard"   as const, category: "Two Pointers",      totalAttempts: 3, notes: "Two-pointer approach: track maxLeft and maxRight. Or precompute max arrays." },
  { stateId: "d5", problemId: 25, title: "Min Stack",                        leetcodeNumber: 155, difficulty: "Medium" as const, category: "Stack",             totalAttempts: 1, notes: "Second stack tracking minimums. Push min on every push." },
  { stateId: "d3", problemId: 10, title: "Container With Most Water",        leetcodeNumber: 11,  difficulty: "Medium" as const, category: "Two Pointers",      totalAttempts: 2, notes: "Two pointers from each end. Move the shorter one inward." },
  { stateId: "d6", problemId: 24, title: "Evaluate Reverse Polish Notation", leetcodeNumber: 150, difficulty: "Medium" as const, category: "Stack",             totalAttempts: 1, notes: null },
  { stateId: "d1", problemId: 1,  title: "Two Sum",                          leetcodeNumber: 1,   difficulty: "Easy"   as const, category: "Arrays & Hashing", totalAttempts: 3, notes: "Use hash map for O(n). Watch for same-element edge case." },
  { stateId: "d7", problemId: 32, title: "Binary Search",                    leetcodeNumber: 704, difficulty: "Easy"   as const, category: "Binary Search",    totalAttempts: 2, notes: null },
  { stateId: "d2", problemId: 3,  title: "Group Anagrams",                   leetcodeNumber: 49,  difficulty: "Medium" as const, category: "Arrays & Hashing", totalAttempts: 2, notes: null },
  { stateId: "d4", problemId: 13, title: "Valid Palindrome",                 leetcodeNumber: 125, difficulty: "Easy"   as const, category: "Two Pointers",      totalAttempts: 2, notes: null },
];

/* ── Demo data for Stats page ── */

export const DEMO_STATS_DATA = {
  categoryStats,
  difficultyBreakdown: difficultyBreakdown.map(d => ({ ...d })),
  attemptHistory: Array.from({ length: 30 }, (_, i) => {
    const idx = 29 - i;
    const counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 3, 4, 0, 5, 3, 4, 6, 3, 2, 0, 4, 0];
    return { date: dateStr(idx), count: counts[idx] ?? 0 };
  }),
  qualityDistribution: [
    { quality: "OPTIMAL", count: 24 },
    { quality: "SUBOPTIMAL", count: 5 },
    { quality: "BRUTE_FORCE", count: 12 },
    { quality: "NONE", count: 3 },
  ],
  retentionBuckets: [
    { label: "Strong", count: 4, color: "bg-green-500" },
    { label: "Good", count: 3, color: "bg-emerald-400" },
    { label: "Fading", count: 3, color: "bg-amber-500" },
    { label: "Weak", count: 3, color: "bg-orange-500" },
    { label: "Critical", count: 2, color: "bg-red-500" },
  ],
  totalSolveMinutes: 320,
  totalStudyMinutes: 180,
  avgSolveMinutes: 18,
  avgConfidence: 3.2,
};

/* ── Demo data for Drill page ── */

export const DEMO_DRILL_CATEGORIES = [
  {
    name: "Arrays & Hashing",
    total: 9,
    attempted: 7,
    avgRetention: 0.70,
    problems: [
      { id: 1,  leetcodeNumber: 1,   title: "Two Sum",                      difficulty: "Easy"   as const, leetcodeUrl: "https://leetcode.com/problems/two-sum/",                       attempted: true,  retention: 0.45, totalAttempts: 3 },
      { id: 5,  leetcodeNumber: 217, title: "Contains Duplicate",            difficulty: "Easy"   as const, leetcodeUrl: "https://leetcode.com/problems/contains-duplicate/",            attempted: true,  retention: 0.89, totalAttempts: 3 },
      { id: 7,  leetcodeNumber: 242, title: "Valid Anagram",                 difficulty: "Easy"   as const, leetcodeUrl: "https://leetcode.com/problems/valid-anagram/",                 attempted: true,  retention: 0.94, totalAttempts: 4 },
      { id: 3,  leetcodeNumber: 49,  title: "Group Anagrams",               difficulty: "Medium" as const, leetcodeUrl: "https://leetcode.com/problems/group-anagrams/",               attempted: true,  retention: 0.52, totalAttempts: 2 },
      { id: 9,  leetcodeNumber: 347, title: "Top K Frequent Elements",      difficulty: "Medium" as const, leetcodeUrl: "https://leetcode.com/problems/top-k-frequent-elements/",      attempted: true,  retention: 0.71, totalAttempts: 2 },
      { id: 6,  leetcodeNumber: 238, title: "Product of Array Except Self", difficulty: "Medium" as const, leetcodeUrl: "https://leetcode.com/problems/product-of-array-except-self/", attempted: true,  retention: 0.65, totalAttempts: 2 },
      { id: 4,  leetcodeNumber: 128, title: "Longest Consecutive Sequence", difficulty: "Medium" as const, leetcodeUrl: "https://leetcode.com/problems/longest-consecutive-sequence/", attempted: true,  retention: 0.73, totalAttempts: 2 },
      { id: 2,  leetcodeNumber: 36,  title: "Valid Sudoku",                 difficulty: "Medium" as const, leetcodeUrl: "https://leetcode.com/problems/valid-sudoku/",                 attempted: false, retention: null, totalAttempts: 0 },
      { id: 8,  leetcodeNumber: 271, title: "Encode and Decode Strings",    difficulty: "Medium" as const, leetcodeUrl: "https://leetcode.com/problems/encode-and-decode-strings/",    attempted: false, retention: null, totalAttempts: 0 },
    ],
  },
  {
    name: "Two Pointers",
    total: 5,
    attempted: 3,
    avgRetention: 0.40,
    problems: [
      { id: 13, leetcodeNumber: 125, title: "Valid Palindrome",          difficulty: "Easy"   as const, leetcodeUrl: "https://leetcode.com/problems/valid-palindrome/",           attempted: true,  retention: 0.61, totalAttempts: 2 },
      { id: 10, leetcodeNumber: 11,  title: "Container With Most Water", difficulty: "Medium" as const, leetcodeUrl: "https://leetcode.com/problems/container-with-most-water/", attempted: true,  retention: 0.38, totalAttempts: 2 },
      { id: 12, leetcodeNumber: 42,  title: "Trapping Rain Water",       difficulty: "Hard"   as const, leetcodeUrl: "https://leetcode.com/problems/trapping-rain-water/",       attempted: true,  retention: 0.22, totalAttempts: 3 },
      { id: 11, leetcodeNumber: 15,  title: "3Sum",                      difficulty: "Medium" as const, leetcodeUrl: "https://leetcode.com/problems/3sum/",                      attempted: false, retention: null, totalAttempts: 0 },
      { id: 14, leetcodeNumber: 167, title: "Two Sum II Input Array Is Sorted", difficulty: "Medium" as const, leetcodeUrl: "https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/", attempted: false, retention: null, totalAttempts: 0 },
    ],
  },
  {
    name: "Sliding Window",
    total: 6,
    attempted: 2,
    avgRetention: 0.70,
    problems: [
      { id: 17, leetcodeNumber: 121, title: "Best Time to Buy And Sell Stock",             difficulty: "Easy"   as const, leetcodeUrl: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/",              attempted: true,  retention: 0.82, totalAttempts: 3 },
      { id: 15, leetcodeNumber: 3,   title: "Longest Substring Without Repeating Characters", difficulty: "Medium" as const, leetcodeUrl: "https://leetcode.com/problems/longest-substring-without-repeating-characters/", attempted: true, retention: 0.58, totalAttempts: 2 },
      { id: 19, leetcodeNumber: 424, title: "Longest Repeating Character Replacement", difficulty: "Medium" as const, leetcodeUrl: "https://leetcode.com/problems/longest-repeating-character-replacement/", attempted: false, retention: null, totalAttempts: 0 },
      { id: 20, leetcodeNumber: 567, title: "Permutation In String",                   difficulty: "Medium" as const, leetcodeUrl: "https://leetcode.com/problems/permutation-in-string/",                attempted: false, retention: null, totalAttempts: 0 },
      { id: 16, leetcodeNumber: 76,  title: "Minimum Window Substring",                difficulty: "Hard"   as const, leetcodeUrl: "https://leetcode.com/problems/minimum-window-substring/",                attempted: false, retention: null, totalAttempts: 0 },
      { id: 18, leetcodeNumber: 239, title: "Sliding Window Maximum",                  difficulty: "Hard"   as const, leetcodeUrl: "https://leetcode.com/problems/sliding-window-maximum/",                  attempted: false, retention: null, totalAttempts: 0 },
    ],
  },
  { name: "Stack",            total: 7,  attempted: 2, avgRetention: 0.40, problems: [] },
  { name: "Binary Search",    total: 7,  attempted: 2, avgRetention: 0.61, problems: [] },
  { name: "Linked List",      total: 11, attempted: 0, avgRetention: 0,    problems: [] },
  { name: "Trees",            total: 15, attempted: 0, avgRetention: 0,    problems: [] },
  { name: "Tries",            total: 3,  attempted: 0, avgRetention: 0,    problems: [] },
  { name: "Heap / Priority Queue",        total: 7,  attempted: 0, avgRetention: 0, problems: [] },
  { name: "Backtracking",                 total: 9,  attempted: 0, avgRetention: 0, problems: [] },
  { name: "Graphs",                       total: 13, attempted: 0, avgRetention: 0, problems: [] },
  { name: "Advanced Graphs",              total: 6,  attempted: 0, avgRetention: 0, problems: [] },
  { name: "1-D Dynamic Programming",      total: 12, attempted: 0, avgRetention: 0, problems: [] },
  { name: "2-D Dynamic Programming",      total: 11, attempted: 0, avgRetention: 0, problems: [] },
  { name: "Greedy",                       total: 8,  attempted: 0, avgRetention: 0, problems: [] },
  { name: "Intervals",                    total: 6,  attempted: 0, avgRetention: 0, problems: [] },
  { name: "Math & Geometry",              total: 8,  attempted: 0, avgRetention: 0, problems: [] },
  { name: "Bit Manipulation",             total: 7,  attempted: 0, avgRetention: 0, problems: [] },
];

/* ── Drill types & demo data ── */

export type DrillLevel = 1 | 2 | 3 | 4 | 5;
export type DrillConfidence = 1 | 2 | 3 | 4; // Again/Hard/Good/Easy

export interface DrillTestCase {
  input: string;
  expected: string;
}

export interface SyntaxDrill {
  id: number;
  title: string;
  category: string;
  level: DrillLevel;
  language: string;
  prompt: string;
  expectedCode: string;
  alternatives: string[];
  explanation: string;
  tags: string[];
  promptVariants?: string[];
  testCases?: DrillTestCase[];
  distractors?: string[];
}

export interface UserDrillState {
  drillId: number;
  stability: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  totalAttempts: number;
  bestConfidence: DrillConfidence | null;
}

export interface DrillAttemptPayload {
  drillId: number;
  userCode: string;
  confidence: DrillConfidence;
  sessionPosition: number;
  categoryStreak: number;
}

export type DemoDrillStatus = "due" | "new" | "mastered";

export interface DemoDrill {
  id: number;
  title: string;
  category: string;
  level: DrillLevel;
  prompt: string;
  expectedCode: string;
  alternatives?: string[];
  explanation: string;
  dueStatus: DemoDrillStatus;
  totalAttempts: number;
  stability: number;
  testCases?: DrillTestCase[];
  distractors?: string[];
}

export const DEMO_DRILLS: DemoDrill[] = [
  {
    id: 1,
    title: "Build a frequency counter",
    category: "Arrays & Hashing",
    level: 1,
    prompt: "Given an array `nums`, build a hash map that maps each number to how many times it appears.",
    expectedCode: `freq = {}
for n in nums:
    freq[n] = freq.get(n, 0) + 1`,
    alternatives: [
      `from collections import Counter
freq = Counter(nums)`,
      `from collections import defaultdict
freq = defaultdict(int)
for n in nums:
    freq[n] += 1`,
    ],
    explanation: "Use `dict.get(key, default)` to safely increment. This is the foundation of most hash map patterns — counting occurrences in O(n) time, O(n) space.",
    dueStatus: "due",
    totalAttempts: 3,
    stability: 4,
  },
  {
    id: 2,
    title: "Two-pass hash map lookup",
    category: "Arrays & Hashing",
    level: 2,
    prompt: "Given `nums` and a `target`, return indices of two numbers that add up to `target`. Use a hash map.",
    expectedCode: `seen = {}
for i, n in enumerate(nums):
    comp = target - n
    if comp in seen:
        return [seen[comp], i]
    seen[n] = i`,
    explanation: "Store each number's index as you iterate. For each element, check if its complement (`target - n`) was already seen. One pass, O(n) time.",
    dueStatus: "due",
    totalAttempts: 2,
    stability: 3,
  },
  {
    id: 3,
    title: "Opposite-end two pointers",
    category: "Two Pointers",
    level: 1,
    prompt: "Write the two-pointer loop to check if a string `s` is a palindrome. Use `left` and `right` indices.",
    expectedCode: `left, right = 0, len(s) - 1
while left < right:
    if s[left] != s[right]:
        return False
    left += 1
    right -= 1
return True`,
    alternatives: [
      `return s == s[::-1]`,
    ],
    explanation: "Classic opposite-end pattern: start pointers at both ends, move inward. If characters ever mismatch, it's not a palindrome.",
    dueStatus: "due",
    totalAttempts: 4,
    stability: 8,
  },
  {
    id: 4,
    title: "Container with most water",
    category: "Two Pointers",
    level: 3,
    prompt: "Given `height` array, write the two-pointer approach to find max water area. Show the full loop with pointer movement logic.",
    expectedCode: `left, right = 0, len(height) - 1
max_area = 0
while left < right:
    area = min(height[left], height[right]) * (right - left)
    max_area = max(max_area, area)
    if height[left] < height[right]:
        left += 1
    else:
        right -= 1
return max_area`,
    explanation: "Always move the shorter pointer inward — moving the taller one can never increase the area since width decreases. Greedy + two pointers.",
    dueStatus: "new",
    totalAttempts: 0,
    stability: 0,
  },
  {
    id: 5,
    title: "Stack matching brackets",
    category: "Stack",
    level: 1,
    prompt: "Write a function to check if a string of brackets `()[]{}` is valid using a stack.",
    expectedCode: `stack = []
pairs = {')': '(', ']': '[', '}': '{'}
for ch in s:
    if ch in pairs:
        if not stack or stack[-1] != pairs[ch]:
            return False
        stack.pop()
    else:
        stack.append(ch)
return len(stack) == 0`,
    explanation: "Push opening brackets; on a closing bracket, check the stack top matches. If stack is empty at end, all brackets were matched.",
    dueStatus: "due",
    totalAttempts: 5,
    stability: 12,
  },
  {
    id: 6,
    title: "Monotonic stack: next greater",
    category: "Stack",
    level: 3,
    prompt: "Given `temperatures`, return an array where `ans[i]` is the number of days until a warmer temperature. Use a monotonic stack.",
    expectedCode: `ans = [0] * len(temperatures)
stack = []  # indices
for i, t in enumerate(temperatures):
    while stack and temperatures[stack[-1]] < t:
        j = stack.pop()
        ans[j] = i - j
    stack.append(i)
return ans`,
    explanation: "Maintain a decreasing stack of indices. When a warmer temp appears, pop all cooler entries and record the distance. O(n) since each index is pushed/popped once.",
    dueStatus: "new",
    totalAttempts: 0,
    stability: 0,
  },
  {
    id: 7,
    title: "DFS tree traversal",
    category: "Trees",
    level: 1,
    prompt: "Write a recursive function to find the maximum depth of a binary tree. Each node has `.left` and `.right`.",
    expectedCode: `def maxDepth(root):
    if not root:
        return 0
    return 1 + max(maxDepth(root.left), maxDepth(root.right))`,
    alternatives: [
      `def maxDepth(root):
    if root is None:
        return 0
    left = maxDepth(root.left)
    right = maxDepth(root.right)
    return 1 + max(left, right)`,
    ],
    explanation: "Base case: null node has depth 0. Recursive case: depth is 1 plus the max of left and right subtree depths. Classic DFS post-order.",
    dueStatus: "mastered",
    totalAttempts: 6,
    stability: 35,
  },
  {
    id: 8,
    title: "BFS level order traversal",
    category: "Trees",
    level: 2,
    prompt: "Write BFS to return a list of lists, where each inner list contains node values at that level.",
    expectedCode: `from collections import deque
result = []
queue = deque([root])
while queue:
    level = []
    for _ in range(len(queue)):
        node = queue.popleft()
        level.append(node.val)
        if node.left: queue.append(node.left)
        if node.right: queue.append(node.right)
    result.append(level)
return result`,
    explanation: "Process one level at a time by capturing `len(queue)` at the start of each iteration. This gives you clean level grouping with standard BFS.",
    dueStatus: "due",
    totalAttempts: 2,
    stability: 5,
  },
  {
    id: 9,
    title: "Sliding window max length",
    category: "Sliding Window",
    level: 2,
    prompt: "Write the sliding window template for longest substring without repeating characters. Use a set.",
    expectedCode: `seen = set()
left = 0
max_len = 0
for right in range(len(s)):
    while s[right] in seen:
        seen.remove(s[left])
        left += 1
    seen.add(s[right])
    max_len = max(max_len, right - left + 1)
return max_len`,
    explanation: "Expand right pointer to grow window. When duplicate found, shrink from left until valid. Track max window size throughout.",
    dueStatus: "new",
    totalAttempts: 0,
    stability: 0,
  },
  {
    id: 10,
    title: "Invert a binary tree",
    category: "Trees",
    level: 2,
    prompt: "Write a recursive function to invert (mirror) a binary tree. Swap left and right children at every node.",
    expectedCode: `def invertTree(root):
    if not root:
        return None
    root.left, root.right = root.right, root.left
    invertTree(root.left)
    invertTree(root.right)
    return root`,
    alternatives: [
      `def invertTree(root):
    if root is None:
        return None
    left = invertTree(root.left)
    right = invertTree(root.right)
    root.left = right
    root.right = left
    return root`,
    ],
    explanation: "Swap children, then recurse on both. Pre-order traversal works naturally — swap first, then let recursion handle subtrees.",
    dueStatus: "mastered",
    totalAttempts: 5,
    stability: 40,
  },
];

export interface DemoFluencyCategory {
  name: string;
  fluency: number;
  drillsDue: number;
  totalDrills: number;
  mastered: number;
}

export const DEMO_FLUENCY_STATS = {
  overallTier: "C" as const,
  categories: [
    { name: "Arrays & Hashing", fluency: 0.68, drillsDue: 2, totalDrills: 12, mastered: 4 },
    { name: "Two Pointers", fluency: 0.52, drillsDue: 1, totalDrills: 8, mastered: 2 },
    { name: "Sliding Window", fluency: 0.30, drillsDue: 0, totalDrills: 6, mastered: 0 },
    { name: "Stack", fluency: 0.61, drillsDue: 1, totalDrills: 8, mastered: 3 },
    { name: "Trees", fluency: 0.55, drillsDue: 1, totalDrills: 10, mastered: 2 },
    { name: "Binary Search", fluency: 0.20, drillsDue: 0, totalDrills: 6, mastered: 0 },
  ] as DemoFluencyCategory[],
};

/* ── Demo data for Mock Interview page ── */

export const DEMO_MOCK_INTERVIEW = {
  problems: [
    { id: 3,  leetcodeNumber: 49, title: "Group Anagrams",      difficulty: "Medium" as const, category: "Arrays & Hashing", leetcodeUrl: "https://leetcode.com/problems/group-anagrams/" },
    { id: 12, leetcodeNumber: 42, title: "Trapping Rain Water", difficulty: "Hard"   as const, category: "Two Pointers",     leetcodeUrl: "https://leetcode.com/problems/trapping-rain-water/" },
  ],
  categories: categoryStats.map(c => c.category),
  weakCategories: ["Two Pointers", "Stack"],
};

/* ── Demo problem states for Problems page ── */

export const DEMO_PROBLEM_STATES: Record<number, { retention: number; totalAttempts: number; lastReviewed: string | null; bestQuality: string | null }> = {};
for (const p of completedProblems) {
  DEMO_PROBLEM_STATES[p.problemId] = {
    retention: p.retrievability,
    totalAttempts: p.totalAttempts,
    lastReviewed: p.lastReviewedAt,
    bestQuality: p.bestQuality,
  };
}
