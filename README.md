# Headspin <> Suitest integration demo

To run the demo:

- Copy `.suitestrc.dist` file to `.suitestrc` and fill in credentials and configuration info according to [our docs](https://suite.st/docs/faq/ids-tokens/).
- Copy `.headspinrc.dist` file to `.headspinrc` and fill in Headspin token and device id.
- Make sure you have [NodeJS](https://nodejs.org/en/) installed.
- In terminal run `npm ci` to install all dependencies.
- In terminal run `npm test` to start the test.
- In the console output you will see a link to the Headspin session for this test run.
