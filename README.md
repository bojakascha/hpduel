# HP-Duel

## What it is
PWA mobile app for training words relevant för Högskoleprovet.

## How it works
- User gets presented with a number of words, one at a time, and they should pick one of 4 alterntives that matches the meaning of the word.
- At the end the total score is presented, as well as  a summary of which words were correct and not correct.
- It is possible to press an word in the summary and see an exmaple use in a sentence and an explanation.

## How it is implemented
- Word collection is a static json file, containing the word, alternative answers, including which one is correct, and a sample sentence with the word.
- UI is html/js/react (if react is needed). 