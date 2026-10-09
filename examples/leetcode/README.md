# LeetCode Top 100 in SomonScript

Solutions to the 100 problems of LeetCode's
[Top 100 Liked](https://leetcode.com/studyplan/top-100-liked/) list, written in
SomonScript.

Every file is a self-contained program:

- a header comment with the problem statement, the approach and its complexity
  (in Tajik);
- the solution, using the standard optimal algorithm;
- test cases — all official LeetCode examples plus edge cases. Each case prints
  `✓` or `✗`; the program throws if any case fails and otherwise ends with
  `Ҳамаи санҷишҳо гузаштанд` ("all tests passed").

## Running

```bash
npm run build

# Run one solution
node dist/cli.js run examples/leetcode/0001-two-sum.som

# Run every solution (or only those whose file name contains a filter)
npm run test:leetcode
node scripts/run-leetcode.js 0001 0146
node scripts/run-leetcode.js --strict

# Jest: compiles each solution in strict mode and runs its test cases
npx jest tests/leetcode.test.ts
```

## Hashing, two pointers, sliding window

| #   | Problem                                                                                                                         | Тоҷикӣ                                  | Difficulty | Solution                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | [Two Sum](https://leetcode.com/problems/two-sum/)                                                                               | Ду адад бо ҷамъи додашуда               | Easy       | [0001-two-sum.som](0001-two-sum.som)                                                                               |
| 49  | [Group Anagrams](https://leetcode.com/problems/group-anagrams/)                                                                 | Гурӯҳбандии анаграммаҳо                 | Medium     | [0049-group-anagrams.som](0049-group-anagrams.som)                                                                 |
| 128 | [Longest Consecutive Sequence](https://leetcode.com/problems/longest-consecutive-sequence/)                                     | Дарозтарин пайдарпаии пай дар пай       | Medium     | [0128-longest-consecutive-sequence.som](0128-longest-consecutive-sequence.som)                                     |
| 283 | [Move Zeroes](https://leetcode.com/problems/move-zeroes/)                                                                       | Кӯчонидани сифрҳо                       | Easy       | [0283-move-zeroes.som](0283-move-zeroes.som)                                                                       |
| 11  | [Container With Most Water](https://leetcode.com/problems/container-with-most-water/)                                           | Зарф бо бештарин об                     | Medium     | [0011-container-with-most-water.som](0011-container-with-most-water.som)                                           |
| 15  | [3Sum](https://leetcode.com/problems/3sum/)                                                                                     | Се адад бо ҷамъи сифр                   | Medium     | [0015-3sum.som](0015-3sum.som)                                                                                     |
| 42  | [Trapping Rain Water](https://leetcode.com/problems/trapping-rain-water/)                                                       | Ҷамъ шудани оби борон                   | Hard       | [0042-trapping-rain-water.som](0042-trapping-rain-water.som)                                                       |
| 3   | [Longest Substring Without Repeating Characters](https://leetcode.com/problems/longest-substring-without-repeating-characters/) | Дарозтарин зерсатр бе аломатҳои такрорӣ | Medium     | [0003-longest-substring-without-repeating-characters.som](0003-longest-substring-without-repeating-characters.som) |
| 438 | [Find All Anagrams in a String](https://leetcode.com/problems/find-all-anagrams-in-a-string/)                                   | Ёфтани ҳамаи анаграммаҳо дар сатр       | Medium     | [0438-find-all-anagrams-in-a-string.som](0438-find-all-anagrams-in-a-string.som)                                   |
| 76  | [Minimum Window Substring](https://leetcode.com/problems/minimum-window-substring/)                                             | Хурдтарин равзанаи зерсатр              | Hard       | [0076-minimum-window-substring.som](0076-minimum-window-substring.som)                                             |

## Arrays and matrices

| #   | Problem                                                                                     | Тоҷикӣ                             | Difficulty | Solution                                                                       |
| --- | ------------------------------------------------------------------------------------------- | ---------------------------------- | ---------- | ------------------------------------------------------------------------------ |
| 560 | [Subarray Sum Equals K](https://leetcode.com/problems/subarray-sum-equals-k/)               | Зеррӯйхатҳо бо ҷамъи баробари k    | Medium     | [0560-subarray-sum-equals-k.som](0560-subarray-sum-equals-k.som)               |
| 239 | [Sliding Window Maximum](https://leetcode.com/problems/sliding-window-maximum/)             | Ҳадди аксар дар равзанаи лағжанда  | Hard       | [0239-sliding-window-maximum.som](0239-sliding-window-maximum.som)             |
| 53  | [Maximum Subarray](https://leetcode.com/problems/maximum-subarray/)                         | Зеррӯйхати ҳадди аксар             | Medium     | [0053-maximum-subarray.som](0053-maximum-subarray.som)                         |
| 56  | [Merge Intervals](https://leetcode.com/problems/merge-intervals/)                           | Муттаҳид кардани фосилаҳо          | Medium     | [0056-merge-intervals.som](0056-merge-intervals.som)                           |
| 189 | [Rotate Array](https://leetcode.com/problems/rotate-array/)                                 | Гардонидани рӯйхат                 | Medium     | [0189-rotate-array.som](0189-rotate-array.som)                                 |
| 238 | [Product of Array Except Self](https://leetcode.com/problems/product-of-array-except-self/) | Ҳосили зарби рӯйхат ба ғайр аз худ | Medium     | [0238-product-of-array-except-self.som](0238-product-of-array-except-self.som) |
| 41  | [First Missing Positive](https://leetcode.com/problems/first-missing-positive/)             | Аввалин адади мусбати гумшуда      | Hard       | [0041-first-missing-positive.som](0041-first-missing-positive.som)             |
| 73  | [Set Matrix Zeroes](https://leetcode.com/problems/set-matrix-zeroes/)                       | Сифр кардани матритса              | Medium     | [0073-set-matrix-zeroes.som](0073-set-matrix-zeroes.som)                       |
| 54  | [Spiral Matrix](https://leetcode.com/problems/spiral-matrix/)                               | Матритсаи спиралӣ                  | Medium     | [0054-spiral-matrix.som](0054-spiral-matrix.som)                               |
| 48  | [Rotate Image](https://leetcode.com/problems/rotate-image/)                                 | Гардонидани тасвир                 | Medium     | [0048-rotate-image.som](0048-rotate-image.som)                                 |
| 240 | [Search a 2D Matrix II](https://leetcode.com/problems/search-a-2d-matrix-ii/)               | Ҷустуҷӯ дар матритсаи дученака II  | Medium     | [0240-search-a-2d-matrix-ii.som](0240-search-a-2d-matrix-ii.som)               |

## Linked lists

| #   | Problem                                                                                             | Тоҷикӣ                                      | Difficulty | Solution                                                                               |
| --- | --------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| 160 | [Intersection of Two Linked Lists](https://leetcode.com/problems/intersection-of-two-linked-lists/) | Буриши ду рӯйхати пайваст                   | Easy       | [0160-intersection-of-two-linked-lists.som](0160-intersection-of-two-linked-lists.som) |
| 206 | [Reverse Linked List](https://leetcode.com/problems/reverse-linked-list/)                           | Баргардонидани рӯйхати пайваст              | Easy       | [0206-reverse-linked-list.som](0206-reverse-linked-list.som)                           |
| 234 | [Palindrome Linked List](https://leetcode.com/problems/palindrome-linked-list/)                     | Рӯйхати пайвасти палиндромӣ                 | Easy       | [0234-palindrome-linked-list.som](0234-palindrome-linked-list.som)                     |
| 141 | [Linked List Cycle](https://leetcode.com/problems/linked-list-cycle/)                               | Давр дар рӯйхати пайваст                    | Easy       | [0141-linked-list-cycle.som](0141-linked-list-cycle.som)                               |
| 142 | [Linked List Cycle II](https://leetcode.com/problems/linked-list-cycle-ii/)                         | Давр дар рӯйхати пайваст II                 | Medium     | [0142-linked-list-cycle-ii.som](0142-linked-list-cycle-ii.som)                         |
| 21  | [Merge Two Sorted Lists](https://leetcode.com/problems/merge-two-sorted-lists/)                     | Якҷоя кардани ду рӯйхати мураттаб           | Easy       | [0021-merge-two-sorted-lists.som](0021-merge-two-sorted-lists.som)                     |
| 2   | [Add Two Numbers](https://leetcode.com/problems/add-two-numbers/)                                   | Ҷамъи ду адад                               | Medium     | [0002-add-two-numbers.som](0002-add-two-numbers.som)                                   |
| 19  | [Remove Nth Node From End of List](https://leetcode.com/problems/remove-nth-node-from-end-of-list/) | Ҳазфи гиреҳи n-ум аз охири рӯйхат           | Medium     | [0019-remove-nth-node-from-end-of-list.som](0019-remove-nth-node-from-end-of-list.som) |
| 24  | [Swap Nodes in Pairs](https://leetcode.com/problems/swap-nodes-in-pairs/)                           | Ҷой иваз кардани гиреҳҳо ҷуфт-ҷуфт          | Medium     | [0024-swap-nodes-in-pairs.som](0024-swap-nodes-in-pairs.som)                           |
| 25  | [Reverse Nodes in k-Group](https://leetcode.com/problems/reverse-nodes-in-k-group/)                 | Баръакс кардани гиреҳҳо дар гурӯҳҳои k-тоӣ  | Hard       | [0025-reverse-nodes-in-k-group.som](0025-reverse-nodes-in-k-group.som)                 |
| 138 | [Copy List with Random Pointer](https://leetcode.com/problems/copy-list-with-random-pointer/)       | Нусхабардории рӯйхат бо ишоракунаки ихтиёрӣ | Medium     | [0138-copy-list-with-random-pointer.som](0138-copy-list-with-random-pointer.som)       |
| 148 | [Sort List](https://leetcode.com/problems/sort-list/)                                               | Мураттаб кардани рӯйхат                     | Medium     | [0148-sort-list.som](0148-sort-list.som)                                               |
| 23  | [Merge k Sorted Lists](https://leetcode.com/problems/merge-k-sorted-lists/)                         | Якҷоя кардани k рӯйхати мураттаб            | Hard       | [0023-merge-k-sorted-lists.som](0023-merge-k-sorted-lists.som)                         |
| 146 | [LRU Cache](https://leetcode.com/problems/lru-cache/)                                               | Кеши LRU                                    | Medium     | [0146-lru-cache.som](0146-lru-cache.som)                                               |

## Binary trees

| #   | Problem                                                                                                                                               | Тоҷикӣ                                                  | Difficulty | Solution                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 94  | [Binary Tree Inorder Traversal](https://leetcode.com/problems/binary-tree-inorder-traversal/)                                                         | Гузариши мобайнии дарахти дуӣ                           | Easy       | [0094-binary-tree-inorder-traversal.som](0094-binary-tree-inorder-traversal.som)                                                         |
| 104 | [Maximum Depth of Binary Tree](https://leetcode.com/problems/maximum-depth-of-binary-tree/)                                                           | Чуқурии ҳадди аксари дарахти дуӣ                        | Easy       | [0104-maximum-depth-of-binary-tree.som](0104-maximum-depth-of-binary-tree.som)                                                           |
| 226 | [Invert Binary Tree](https://leetcode.com/problems/invert-binary-tree/)                                                                               | Чаппа кардани дарахти дуӣ                               | Easy       | [0226-invert-binary-tree.som](0226-invert-binary-tree.som)                                                                               |
| 101 | [Symmetric Tree](https://leetcode.com/problems/symmetric-tree/)                                                                                       | Дарахти симметрӣ                                        | Easy       | [0101-symmetric-tree.som](0101-symmetric-tree.som)                                                                                       |
| 543 | [Diameter of Binary Tree](https://leetcode.com/problems/diameter-of-binary-tree/)                                                                     | Диаметри дарахти дуӣ                                    | Easy       | [0543-diameter-of-binary-tree.som](0543-diameter-of-binary-tree.som)                                                                     |
| 102 | [Binary Tree Level Order Traversal](https://leetcode.com/problems/binary-tree-level-order-traversal/)                                                 | Гузариши сатҳ ба сатҳи дарахти дуӣ                      | Medium     | [0102-binary-tree-level-order-traversal.som](0102-binary-tree-level-order-traversal.som)                                                 |
| 108 | [Convert Sorted Array to Binary Search Tree](https://leetcode.com/problems/convert-sorted-array-to-binary-search-tree/)                               | Табдили рӯйхати мураттаб ба дарахти ҷустуҷӯии дуӣ       | Easy       | [0108-convert-sorted-array-to-binary-search-tree.som](0108-convert-sorted-array-to-binary-search-tree.som)                               |
| 98  | [Validate Binary Search Tree](https://leetcode.com/problems/validate-binary-search-tree/)                                                             | Санҷиши дарахти ҷустуҷӯии дуӣ                           | Medium     | [0098-validate-binary-search-tree.som](0098-validate-binary-search-tree.som)                                                             |
| 230 | [Kth Smallest Element in a BST](https://leetcode.com/problems/kth-smallest-element-in-a-bst/)                                                         | K-умин хурдтарин унсур дар дарахти ҷустуҷӯии дуӣ        | Medium     | [0230-kth-smallest-element-in-a-bst.som](0230-kth-smallest-element-in-a-bst.som)                                                         |
| 199 | [Binary Tree Right Side View](https://leetcode.com/problems/binary-tree-right-side-view/)                                                             | Намуди тарафи рости дарахти дуӣ                         | Medium     | [0199-binary-tree-right-side-view.som](0199-binary-tree-right-side-view.som)                                                             |
| 114 | [Flatten Binary Tree to Linked List](https://leetcode.com/problems/flatten-binary-tree-to-linked-list/)                                               | Ҳамвор кардани дарахти дуӣ ба рӯйхати пайваст           | Medium     | [0114-flatten-binary-tree-to-linked-list.som](0114-flatten-binary-tree-to-linked-list.som)                                               |
| 105 | [Construct Binary Tree from Preorder and Inorder Traversal](https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/) | Сохтани дарахти дуӣ аз гузаришҳои пеш-тартиб ва мобайнӣ | Medium     | [0105-construct-binary-tree-from-preorder-and-inorder-traversal.som](0105-construct-binary-tree-from-preorder-and-inorder-traversal.som) |
| 437 | [Path Sum III](https://leetcode.com/problems/path-sum-iii/)                                                                                           | Ҷамъи роҳ III                                           | Medium     | [0437-path-sum-iii.som](0437-path-sum-iii.som)                                                                                           |
| 236 | [Lowest Common Ancestor of a Binary Tree](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/)                                     | Наздиктарин аҷдоди умумӣ дар дарахти дуӣ                | Medium     | [0236-lowest-common-ancestor-of-a-binary-tree.som](0236-lowest-common-ancestor-of-a-binary-tree.som)                                     |
| 124 | [Binary Tree Maximum Path Sum](https://leetcode.com/problems/binary-tree-maximum-path-sum/)                                                           | Ҷамъи ҳадди аксари роҳ дар дарахти дуӣ                  | Hard       | [0124-binary-tree-maximum-path-sum.som](0124-binary-tree-maximum-path-sum.som)                                                           |

## Graphs and tries

| #   | Problem                                                                                   | Тоҷикӣ                                                  | Difficulty | Solution                                                                   |
| --- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------- | -------------------------------------------------------------------------- |
| 200 | [Number of Islands](https://leetcode.com/problems/number-of-islands/)                     | Шумораи ҷазираҳо                                        | Medium     | [0200-number-of-islands.som](0200-number-of-islands.som)                   |
| 994 | [Rotting Oranges](https://leetcode.com/problems/rotting-oranges/)                         | Афлесунҳои пӯсида                                       | Medium     | [0994-rotting-oranges.som](0994-rotting-oranges.som)                       |
| 207 | [Course Schedule](https://leetcode.com/problems/course-schedule/)                         | Ҷадвали курсҳо                                          | Medium     | [0207-course-schedule.som](0207-course-schedule.som)                       |
| 208 | [Implement Trie (Prefix Tree)](https://leetcode.com/problems/implement-trie-prefix-tree/) | Сохтани дарахти пешвандӣ (Implement Trie (Prefix Tree)) | Medium     | [0208-implement-trie-prefix-tree.som](0208-implement-trie-prefix-tree.som) |

## Backtracking

| #   | Problem                                                                                                       | Тоҷикӣ                         | Difficulty | Solution                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------- | ------------------------------ | ---------- | ------------------------------------------------------------------------------------------------ |
| 46  | [Permutations](https://leetcode.com/problems/permutations/)                                                   | Ҷойгиркуниҳо                   | Medium     | [0046-permutations.som](0046-permutations.som)                                                   |
| 78  | [Subsets](https://leetcode.com/problems/subsets/)                                                             | Зермаҷмӯъҳо                    | Medium     | [0078-subsets.som](0078-subsets.som)                                                             |
| 17  | [Letter Combinations of a Phone Number](https://leetcode.com/problems/letter-combinations-of-a-phone-number/) | Омезиши ҳарфҳои рақами телефон | Medium     | [0017-letter-combinations-of-a-phone-number.som](0017-letter-combinations-of-a-phone-number.som) |
| 39  | [Combination Sum](https://leetcode.com/problems/combination-sum/)                                             | Ҷамъи омезишҳо                 | Medium     | [0039-combination-sum.som](0039-combination-sum.som)                                             |
| 22  | [Generate Parentheses](https://leetcode.com/problems/generate-parentheses/)                                   | Тавлиди қавсҳо                 | Medium     | [0022-generate-parentheses.som](0022-generate-parentheses.som)                                   |
| 79  | [Word Search](https://leetcode.com/problems/word-search/)                                                     | Ҷустуҷӯи калима                | Medium     | [0079-word-search.som](0079-word-search.som)                                                     |
| 131 | [Palindrome Partitioning](https://leetcode.com/problems/palindrome-partitioning/)                             | Тақсимот ба палиндромҳо        | Medium     | [0131-palindrome-partitioning.som](0131-palindrome-partitioning.som)                             |
| 51  | [N-Queens](https://leetcode.com/problems/n-queens/)                                                           | N малика                       | Hard       | [0051-n-queens.som](0051-n-queens.som)                                                           |

## Binary search

| #   | Problem                                                                                                                                           | Тоҷикӣ                                                  | Difficulty | Solution                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 35  | [Search Insert Position](https://leetcode.com/problems/search-insert-position/)                                                                   | Ҷойи гузоштан дар ҷустуҷӯ                               | Easy       | [0035-search-insert-position.som](0035-search-insert-position.som)                                                                   |
| 74  | [Search a 2D Matrix](https://leetcode.com/problems/search-a-2d-matrix/)                                                                           | Ҷустуҷӯ дар матритсаи дученака                          | Medium     | [0074-search-a-2d-matrix.som](0074-search-a-2d-matrix.som)                                                                           |
| 34  | [Find First and Last Position of Element in Sorted Array](https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/) | Ёфтани мавқеи аввал ва охири унсур дар рӯйхати мураттаб | Medium     | [0034-find-first-and-last-position-of-element-in-sorted-array.som](0034-find-first-and-last-position-of-element-in-sorted-array.som) |
| 33  | [Search in Rotated Sorted Array](https://leetcode.com/problems/search-in-rotated-sorted-array/)                                                   | Ҷустуҷӯ дар рӯйхати мураттаби давршуда                  | Medium     | [0033-search-in-rotated-sorted-array.som](0033-search-in-rotated-sorted-array.som)                                                   |
| 153 | [Find Minimum in Rotated Sorted Array](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/)                                       | Ёфтани хурдтарин дар рӯйхати мураттаби давршуда         | Medium     | [0153-find-minimum-in-rotated-sorted-array.som](0153-find-minimum-in-rotated-sorted-array.som)                                       |
| 4   | [Median of Two Sorted Arrays](https://leetcode.com/problems/median-of-two-sorted-arrays/)                                                         | Медианаи ду рӯйхати мураттаб                            | Hard       | [0004-median-of-two-sorted-arrays.som](0004-median-of-two-sorted-arrays.som)                                                         |

## Stacks and heaps

| #   | Problem                                                                                           | Тоҷикӣ                                | Difficulty | Solution                                                                             |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------- | ------------------------------------------------------------------------------------ |
| 20  | [Valid Parentheses](https://leetcode.com/problems/valid-parentheses/)                             | Қавсҳои дуруст                        | Easy       | [0020-valid-parentheses.som](0020-valid-parentheses.som)                             |
| 155 | [Min Stack](https://leetcode.com/problems/min-stack/)                                             | Стеки хурдтарин                       | Medium     | [0155-min-stack.som](0155-min-stack.som)                                             |
| 394 | [Decode String](https://leetcode.com/problems/decode-string/)                                     | Кушодани сатри рамзгузоришуда         | Medium     | [0394-decode-string.som](0394-decode-string.som)                                     |
| 739 | [Daily Temperatures](https://leetcode.com/problems/daily-temperatures/)                           | Ҳарорати рӯзона                       | Medium     | [0739-daily-temperatures.som](0739-daily-temperatures.som)                           |
| 84  | [Largest Rectangle in Histogram](https://leetcode.com/problems/largest-rectangle-in-histogram/)   | Бузургтарин росткунҷа дар гистограмма | Hard       | [0084-largest-rectangle-in-histogram.som](0084-largest-rectangle-in-histogram.som)   |
| 215 | [Kth Largest Element in an Array](https://leetcode.com/problems/kth-largest-element-in-an-array/) | K-умин бузургтарин унсур дар рӯйхат   | Medium     | [0215-kth-largest-element-in-an-array.som](0215-kth-largest-element-in-an-array.som) |
| 347 | [Top K Frequent Elements](https://leetcode.com/problems/top-k-frequent-elements/)                 | K унсури бештар такроршаванда         | Medium     | [0347-top-k-frequent-elements.som](0347-top-k-frequent-elements.som)                 |
| 295 | [Find Median from Data Stream](https://leetcode.com/problems/find-median-from-data-stream/)       | Ёфтани миёна аз ҷараёни додаҳо        | Hard       | [0295-find-median-from-data-stream.som](0295-find-median-from-data-stream.som)       |

## Greedy

| #   | Problem                                                                                           | Тоҷикӣ                                           | Difficulty | Solution                                                                             |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------ |
| 121 | [Best Time to Buy and Sell Stock](https://leetcode.com/problems/best-time-to-buy-and-sell-stock/) | Вақти беҳтарин барои харидан ва фурӯхтани саҳмия | Easy       | [0121-best-time-to-buy-and-sell-stock.som](0121-best-time-to-buy-and-sell-stock.som) |
| 55  | [Jump Game](https://leetcode.com/problems/jump-game/)                                             | Бозии ҷаҳиш                                      | Medium     | [0055-jump-game.som](0055-jump-game.som)                                             |
| 45  | [Jump Game II](https://leetcode.com/problems/jump-game-ii/)                                       | Бозии ҷаҳиш II                                   | Medium     | [0045-jump-game-ii.som](0045-jump-game-ii.som)                                       |
| 763 | [Partition Labels](https://leetcode.com/problems/partition-labels/)                               | Тақсимоти нишонаҳо                               | Medium     | [0763-partition-labels.som](0763-partition-labels.som)                               |

## Dynamic programming

| #    | Problem                                                                                         | Тоҷикӣ                               | Difficulty | Solution                                                                           |
| ---- | ----------------------------------------------------------------------------------------------- | ------------------------------------ | ---------- | ---------------------------------------------------------------------------------- |
| 70   | [Climbing Stairs](https://leetcode.com/problems/climbing-stairs/)                               | Баромадан аз зинапоя                 | Easy       | [0070-climbing-stairs.som](0070-climbing-stairs.som)                               |
| 118  | [Pascal's Triangle](https://leetcode.com/problems/pascals-triangle/)                            | Секунҷаи Паскал                      | Easy       | [0118-pascals-triangle.som](0118-pascals-triangle.som)                             |
| 198  | [House Robber](https://leetcode.com/problems/house-robber/)                                     | Дузди хонаҳо                         | Medium     | [0198-house-robber.som](0198-house-robber.som)                                     |
| 279  | [Perfect Squares](https://leetcode.com/problems/perfect-squares/)                               | Квадратҳои комил                     | Medium     | [0279-perfect-squares.som](0279-perfect-squares.som)                               |
| 322  | [Coin Change](https://leetcode.com/problems/coin-change/)                                       | Иваз кардани танга                   | Medium     | [0322-coin-change.som](0322-coin-change.som)                                       |
| 139  | [Word Break](https://leetcode.com/problems/word-break/)                                         | Ҷудо кардани калимаҳо                | Medium     | [0139-word-break.som](0139-word-break.som)                                         |
| 300  | [Longest Increasing Subsequence](https://leetcode.com/problems/longest-increasing-subsequence/) | Дарозтарин зерпайдарпаии афзоянда    | Medium     | [0300-longest-increasing-subsequence.som](0300-longest-increasing-subsequence.som) |
| 152  | [Maximum Product Subarray](https://leetcode.com/problems/maximum-product-subarray/)             | Зеррӯйхат бо ҳосили зарби калонтарин | Medium     | [0152-maximum-product-subarray.som](0152-maximum-product-subarray.som)             |
| 416  | [Partition Equal Subset Sum](https://leetcode.com/problems/partition-equal-subset-sum/)         | Тақсим ба ду зермаҷмӯи баробар       | Medium     | [0416-partition-equal-subset-sum.som](0416-partition-equal-subset-sum.som)         |
| 32   | [Longest Valid Parentheses](https://leetcode.com/problems/longest-valid-parentheses/)           | Дарозтарин қавсҳои дуруст            | Hard       | [0032-longest-valid-parentheses.som](0032-longest-valid-parentheses.som)           |
| 62   | [Unique Paths](https://leetcode.com/problems/unique-paths/)                                     | Роҳҳои беназир                       | Medium     | [0062-unique-paths.som](0062-unique-paths.som)                                     |
| 64   | [Minimum Path Sum](https://leetcode.com/problems/minimum-path-sum/)                             | Ҷамъи хурдтарини роҳ                 | Medium     | [0064-minimum-path-sum.som](0064-minimum-path-sum.som)                             |
| 5    | [Longest Palindromic Substring](https://leetcode.com/problems/longest-palindromic-substring/)   | Дарозтарин зерсатри палиндромӣ       | Medium     | [0005-longest-palindromic-substring.som](0005-longest-palindromic-substring.som)   |
| 1143 | [Longest Common Subsequence](https://leetcode.com/problems/longest-common-subsequence/)         | Дарозтарин зерпайдарпаии умумӣ       | Medium     | [1143-longest-common-subsequence.som](1143-longest-common-subsequence.som)         |
| 72   | [Edit Distance](https://leetcode.com/problems/edit-distance/)                                   | Масофаи таҳрир                       | Medium     | [0072-edit-distance.som](0072-edit-distance.som)                                   |

## Tricks

| #   | Problem                                                                               | Тоҷикӣ                | Difficulty | Solution                                                                 |
| --- | ------------------------------------------------------------------------------------- | --------------------- | ---------- | ------------------------------------------------------------------------ |
| 136 | [Single Number](https://leetcode.com/problems/single-number/)                         | Рақами ягона          | Easy       | [0136-single-number.som](0136-single-number.som)                         |
| 169 | [Majority Element](https://leetcode.com/problems/majority-element/)                   | Унсури аксарият       | Easy       | [0169-majority-element.som](0169-majority-element.som)                   |
| 75  | [Sort Colors](https://leetcode.com/problems/sort-colors/)                             | Тартиб додани рангҳо  | Medium     | [0075-sort-colors.som](0075-sort-colors.som)                             |
| 31  | [Next Permutation](https://leetcode.com/problems/next-permutation/)                   | Ҷойгиркунии навбатӣ   | Medium     | [0031-next-permutation.som](0031-next-permutation.som)                   |
| 287 | [Find the Duplicate Number](https://leetcode.com/problems/find-the-duplicate-number/) | Ёфтани рақами такрорӣ | Medium     | [0287-find-the-duplicate-number.som](0287-find-the-duplicate-number.som) |
