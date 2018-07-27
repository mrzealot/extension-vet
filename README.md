# extension-vet

Checking the differences between the declared and actual API usages of chrome extensions

Major steps in the process

1. Scrape a representatice set of Chrome extensions from the web
1. Extract them and analyze their source codes using esprima/estraverse, estimating the **actual** usages of Chrome API usages like cookie or storage accesses, history permissions, etc. This requires static checkers that are able to recognize usage patterns from the code.
1. Parse their manifests for declared permissions
1. Compare the results and look for anomalies
