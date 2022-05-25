# Nitric Pulumi extension example

This repository provides an example of extending nitric deployed resources using external pulumi scripts that can be run post-deployment.

The scripts will provide a custom DNS name to gateways deployed with nitric, with sub domains matching the name of each deployed nitric API. For a nitric AWS deployment.

e.g. `const mainApi = api('main')`, would result in `main.example.com`.
