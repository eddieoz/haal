# Hääl
# Anonymous Electronic Voting System on Public Blockchains 

Hääl means voice in Estonian. Voice means power of people.

This code is a proof-of-concept of the protocol presented on the whitepaper located at the root folder.
It describes a full process for an e-voting system, using public blockchains and without a mixnet or an oracle for tallying the votes.

The full protocol makes use of:
- Zero-knowledge proofs (with zk-snarks verified on-chain)
- Homomorphic encryption (Paillier protocol + zk)
- Stealth addresses (as proposed by Peter Todd, but ported to ethereum)
- Encrypted notes (e.g Zcash, AZTEC)
- Criptography challenges (based on Sigma protocol)
- Digital signatures
- Ethereum (or another blockchain capable of running dApps)
- other technologies described on the whitepaper

Working in progress.
All contributions are welcome.

## Pre-requisites
- Ganache ^1.2.2
- Node ^8
- Solidity ^0.4.5
- Yarn ^1.13.0 (optional)

## Setup
```
# npm install
run ganache
# node ./node_modules/truffle/build/cli.bundled.js build
```

## Run
```
# node ./node_modules/truffle/build/cli.bundled.js test
```

optionally, you can build and run with yarn
```
# yarn truffle migrate --reset
# yarn truffle test
```

### Compile warnings

Is expected to receive the warning below during contracts compilation:
```
haal/contracts/HAAL/haal.sol:2:1: Warning: Experimental features are turned on. Do not use experimental features on live deployments.
pragma experimental ABIEncoderV2;
^-------------------------------^
```

That message appears because we're using an experimental method to fill arrays:
```
function addVote(
        bytes[] _president, 
        bytes[] _senator, 
        bytes[] _stateGovernor,
[...]
```
and
```
function getVotes(uint _index) view public returns(bytes[], bytes[], bytes[])
```

Apache License
