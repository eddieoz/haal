const chai = require("chai");
const paillier = require('../node_modules/paillier-bignum/src/paillier.js');
const { encryptWithProof, verifyProof } = require('paillier-in-set-zkp');
const bignum = require('big-integer');
const zkSnark = require('snarkjs');
const { stringifyBigInts, unstringifyBigInts } = require("../node_modules/snarkjs/src/stringifybigint.js");
const fs = require('fs');
const crypto = require('crypto-browserify');
const Stealth = require('stealth_eth');
const ethereum = require('ethereumjs-utils');
const coinkey = require('coinkey');
const generateCall = require('../src/generateCall.js');
const web3Utils = require('web3-utils');

// ### Web3 Connection
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'));

// ### Artifacts
const Verifier = artifacts.require('../contracts/HAAL/verifier.sol');
const Haal = artifacts.require('../contracts/HAAL/haal.sol')

const assert = chai.assert;

let verifierAddress = '';
let verifierAbi = '';
let haalVerifier = '';

contract('HAALVerifier', (accounts) => {
    // Creating a collection of tests that should pass
    describe('Install contracts and test', () => {
        beforeEach(async () => {
            haalVerifier = await Verifier.new(accounts[0]);  
            haal = await Haal.new('ballot0001', 0x7b226e223a22313234363239353037393136353933303037);  
            verifierAbi = await haalVerifier.abi;
            verifierAddress = await haalVerifier.address;
        });
        
        it('Test Verifier contract', async () => {
            let result = await haalVerifier.verifyProof(["0x15a03b6fea56f86e2a4c5493638631cdd96c5ff04ba923b8929661b5cf08d54e", "0x09f03215ee03baed9387ea73d77a24245b7832b75d8d0dfa59036fef7e8f50b7"],["0x2e0711108b06327f4be135df82d8f53093b589fad6b184d73a14250fd8c1760e", "0x17fd395da1b14690af6ea55b3d73387ec3641bc879fc3ec9b5ae07b0b177962e"],[["0x0ab08ac7f1e68307d4f1e7b5b31fd4c02696fdde4e61936130fa559242e9e249", "0x03e214d382339d7e767590c8001c62d66b0cfc95a0137afde8db8e112da2a224"],["0x1b52b5bb1b52bd0bbc645ea962ca59f7d034b1837d8d7ca4bbfe8359b88486b4", "0x2b8a227ac1d4510ce2a95f348d6c9ece5d141cb7279b64e5af3d79dab88fe777"]],["0x067e57648b5c75a6a57b5e67f914ec5556bba9abbd86d81cfa145c63ced459db", "0x2e4a4af5e80e87079c4110eb5133bc3cd0cb32cec4d48d288d4d90e6004a05f1"],["0x0e62b3f617a46b25dacb729f3bc6aa0a254691a458df28e72c9b972c207e136a", "0x20f4c8ab3d688769662799d0ac340cdc18be28d49102b6f0fada9d2145a34115"],["0x165d6a818b91a6e93b9728aa43e368282430f27b9c9e4dab7fa7f3a89bc7fc32", "0x1536736b58990e4be37e5457f3ce397ddd2aeafe3ce6606993b3c17509b0ae3c"],["0x0032cb6e404cf17d11cb1ca8b22a38a38143770a21d8b7d81e1b2cd06d41efdd", "0x025e3460012c3322cb7485e4fbd6d360f7f1fb5681f9256abf81cc6e4ca7f1aa"],["0x0a77dd988c44b2b79ef87d19bc7e2b32e0d31621c5b0f2054c102f0cb36fe46e", "0x0e9d81f5641f6fe63354fb69758dc7853625b4405a957a3923e39b6c123ec2c2"],["0x0000000000000000000000000000000000000000000000000000000000000001","0x0000000000000000000000000000000000000000000000000000000000000001","0x0000000000000000000000000000000000000000000000000000000000000001","0x0000000000000000000000000000000000000000000000000000000000000003","0x0000000000000000000000000000000000000000000000000000000000000004","0x0000000000000000000000000000000000000000000000000000000000000002","0x0000000000000000000000000000000000000000000000000000000000000004"]);
            assert.isTrue(result);
        });

        it('Test Haal contract', async () => {
            let result = await haal.ballotIdentifier().then(function (res) {
                return(res);
            })
            assert.equal('0x62616c6c6f743030303100000000000000000000000000000000000000000000', result.toString());
        });

        it("Verify proof on smartcontract", async () => {
            let proof = JSON.parse(fs.readFileSync("./test/circuit/test_trusted_setup/proof.json", "utf8"));
            let publicSignals = JSON.parse(fs.readFileSync("./test/circuit/test_trusted_setup/public.json", "utf8"));
            var verifyCall = await generateCall(publicSignals, proof);  
            result = await haalVerifier.verifyProof.call(verifyCall);
            console.log("result: ", result); 
        });
    });
});


describe("Create and test an ethereum stealth wallet", () => {
    // you need to scan every transaction and look for the following:
    // 1. does the transaction contain an OP_RETURN?
    // 2. if yes, then extract the OP_RETURN
    // 3. is the OP_RETURN data a compressed public key (33 bytes)?
    // 4. if yes, check if mine

    let compressedPubScanKeys = ''; 
    let stealth = {};
    let ethStealthAddress = '';
    let pubKeyToRecover = '';
    let opMarker = '';

    it("Voter create scan keys, encode pub+scan public and send to Vote Admin", () => {

        // Optionally generate two key pairs, can use CoinKey, bitcoinjs-lib, bitcore, etc
        // let payloadKeyPair = coinkey.createRandom()
        // let scanKeyPair = coinkey.createRandom()
        // and use it to fill the stealth object

        stealth = new Stealth({ 
            payloadPrivKey: new Buffer('3ee7c0e1d4cbd9c1fe34aef5e910b23fffe2d0bd1d7f2dd51f567078100fe3d1', 'hex'),
            payloadPubKey: new Buffer('026fa340f85b9a0c3a0d75898ef25064ec569c57d1e8922ceb67ec08e9907adfb2', 'hex'),
            scanPrivKey: new Buffer('1ce88522ea4c6927d53799191a6201806d4dce62db69aadd63603cba8d2d8c9f','hex'),
            scanPubKey: new Buffer('032caa1a564f7f7e17ca5424d4f17495a8568600add7fc1587198d151bddc23e84','hex')
        });

        compressedPubScanKeys = stealth.toString();
        assert.equal(compressedPubScanKeys, 'vJmwnas6bWjz6kerJ1SU52LYxf48GZBdR3tn8haF9pj3dAHqYNsGCgW64WF4k1a1RoNYTko62rsuu4wFbydisaaXCoF7SAtYEqwS2E')

    });

    it("Vote admin receives the public addr and creates a new wallet", () => {
        
        let recoveryFromCompressed = Stealth.fromString(compressedPubScanKeys)

        // single-use nonce key pair, works with CoinKey, bitcoinjs-lib, bitcore, etc
        let keypair = coinkey.createRandom()

        // generate payment address
        ethStealthAddress = ethereum.addHexPrefix(recoveryFromCompressed.genEthPaymentAddress(keypair.privateKey));
        pubKeyToRecover = keypair.publicKey.toString('hex');
        opMarker = recoveryFromCompressed.genPaymentPubKeyHash(keypair.privateKey).toString('hex')

        // send three outputs to a smart-contrac:
        // 1. ETH address
        // 1. Regular pubKeyToRecover
        // 2. Marker with `opMarker`

        assert.isTrue(ethereum.isValidAddress(ethStealthAddress));

    });

    it("Voter discovers his wallet", () => {

        let opMarkerBuffer = new Buffer(opMarker, 'hex');
        let pubKeyToRecoverBuffer = new Buffer(pubKeyToRecover, 'hex');

        let keypair = stealth.checkPaymentPubKeyHash(pubKeyToRecoverBuffer, opMarkerBuffer);

        assert.isNotNull(keypair)
        
    });

    it("Voter recovery private key.", () => {

        let opMarkerBuffer = new Buffer(opMarker, 'hex');
        let pubKeyToRecoverBuffer = new Buffer(pubKeyToRecover, 'hex');

        let keypair = stealth.checkPaymentPubKeyHash(pubKeyToRecoverBuffer, opMarkerBuffer);

        let PrivateToPublic = ethereum.privateToPublic(keypair.privKey).toString('hex');
        let ethAddress = '0x' + ethereum.privateToAddress(keypair.privKey).toString('hex');
        
        assert.equal(ethAddress,ethStealthAddress);
    });


})

describe("Create vote and zksnark of vote", () => {
    let votes = {};

    // Setting up the vote
    let voter = "0x965cd5b715904c37fcebdcb912c672230103adef";
    let signature = "0x234587623459623459782346592346759234856723985762398756324985762349587623459876234578965978234659823469324876324978632457892364879234697853467896";

    votes.president = [0, 0, 1, 0];
    votes.senator = [1, 0];
    votes.stateGovernor = [0, 0, 0, 1];

    let count_votes = 0;
    let ptv = 0;
    let stv = 0;
    let sgtv = 0;

    for (let i = 0; i < votes.president.length; i++) {
        if (votes.president[i] == 1) {
            ptv += 1;
            count_votes += 1;
        }
    }

    for (let j = 0; j < votes.senator.length; j++) {
        if (votes.senator[j] == 1) {
            stv += 1;
            count_votes += 1;
        }
    }

    for (let k = 0; k < votes.stateGovernor.length; k++) {
        if (votes.stateGovernor[k] == 1) {
            sgtv += 1;
            count_votes += 1;
        }
    }

    // Should create and use sha256 of vote
    //let votesSha256 = crypto.createHash('sha256').update(JSON.stringify(votes).toString()).digest('hex');

    let presidentTotalCandidates = votes.president.length;
    let senatorTotalCandidates = votes.senator.length;
    let stateGovernorTotalCandidades = votes.stateGovernor.length;

    // 
    let p = 1234;
    let rcm = [1234, 13134];

    // Input Array to zk-proof circuit
    const inputArray = {
        "voter": voter.toString(),
        "signature": signature.toString(),
        "president": votes.president,
        "senator": votes.senator,
        "stateGovernor": votes.stateGovernor,
        "p": p,
        "rcm": rcm,
        "presidentTotalCandidates": presidentTotalCandidates,
        "senatorTotalCandidates": senatorTotalCandidates,
        "stateGovernorTotalCandidates": stateGovernorTotalCandidades,
        "presidentTotalVotes": ptv,
        "senatorTotalVotes": stv,
        "stateGovernorTotalVotes": sgtv,
        "totalVotes": count_votes
    };

    let circuit = {};
    let setup = {};
    let witness = {};
    let proof = {};
    let publicKey = {};
    let privateKey = {};

    it("Load a circuit", () => {
        // Circuit preparing
        const circuitDef = JSON.parse(fs.readFileSync("zksnarks/circuits/vote-proof1.json", "utf8"));
        circuit = new zkSnark.Circuit(circuitDef);
        assert.equal(circuit.nOutputs, 4);
    });

    it("Create a trusted setup", () => {
        // Trusted setup
        setup = zkSnark.groth.setup(circuit);
        setup.toxic  // Must be discarded.
        assert.equal(setup.vk_verifier.nPublic, 7);
    }).timeout(10000000);

    it("Generate witness", () => {
        // Generate Witness         
        witness = circuit.calculateWitness(inputArray);
        assert.equal(witness.toString(), "1,1,1,1,3,4,2,4,1,1,1,3,0,0,1,0,1,0,0,0,0,1,858418901399080381986333839137122232297777769967,34077102564424341946805774145332421253459555611827306095970056431371046409817239864580385688030092546598700163424794358633725950204037731083721568214179166939530124130154646,1234,1234,13134,0,1,0,1,0,1,0,0,0");
    });

    it("Generate vote proof", () => {
        const vk_proof = setup.vk_proof
        // Generate the proof
        proof = zkSnark.groth.genProof(vk_proof, witness);
        assert.equal(proof.proof.protocol, "groth");
    });

    it("Verify vote proof", () => {
        // Verify the proof
        const vk_verifier = setup.vk_verifier;
        assert.isTrue(zkSnark.groth.isValid(vk_verifier, proof.proof, proof.publicSignals));
    }).timeout(10000000);

    // it("Verify proof on smartcontract", async () => {
    //     var verifyCall = generateCall(proof.publicSignals, proof.proof);
    //     console.log(verifyCall);
    //     let result = await haalVerifier.verifyProof(verifyCall);
    //     assert.isTrue(result); 
    // });
});

describe("Encrypt, count, decrypt and test votes result proof", () => {
    let votes = {};

    // Setting up the vote
    let voter = "0x965cd5b715904c37fcebdcb912c672230103adef";
    let signature = "0x234587623459623459782346592346759234856723985762398756324985762349587623459876234578965978234659823469324876324978632457892364879234697853467896";

    votes.president = [0, 0, 1, 0];
    votes.senator = [1, 0];
    votes.stateGovernor = [0, 0, 0, 1];

    let voteCount = 0;
    let votesArray = [];

    const { publicKey, privateKey } = paillier.generateRandomKeys(1024);

    it("Verify publickey", () => {
        assert(publicKey.bitLength == '1024')
    });

    it("Encrypt votes", () => {
        for (let i = 0; i < votes.president.length; i++) {
            voteCount += votes.president[i];
            // convert vote to bignum
            //let bn1 = bignum(votes.president[i]).mod(publicKey.n);
            let bn1 = bignum(votes.president[i]);
            bn1 = bn1.mod(publicKey.n);
            while (bn1.lt(0)) bn1 = bn1.add(publicKey.n);  // bug in bignum? mod(n) of negative number returns .abs().mod(n). This should fix it
            // encrypt the vote with published pk
            votes.president[i] = publicKey.encrypt(votes.president[i]);
        }

        for (let j = 0; j < votes.senator.length; j++) {
            voteCount += votes.senator[j];
            // convert vote to bignum
            let bn2 = bignum(votes.senator[j]).mod(publicKey.n);
            while (bn2.lt(0)) bn2 = bn2.add(publicKey.n);  // bug in bignum? mod(n) of negative number returns .abs().mod(n). This should fix it
            // encrypt the vote with published pk
            votes.senator[j] = publicKey.encrypt(votes.senator[j]);
        }

        for (let k = 0; k < votes.stateGovernor.length; k++) {
            voteCount += votes.stateGovernor[k];
            // convert vote to bignum
            let bn3 = bignum(votes.stateGovernor[k]).mod(publicKey.n);
            while (bn3.lt(0)) bn3 = bn3.add(publicKey.n);  // bug in bignum? mod(n) of negative number returns .abs().mod(n). This should fix it
            // encrypt the vote with published pk
            votes.stateGovernor[k] = publicKey.encrypt(votes.stateGovernor[k]);
        }
        assert(votes.president[0].mod(votes.president[0]).toString() == '0'); // must be bignumber to .mod()
    });

    it("Testing sum on encrypted votes", () => {

        let encryptedSum = 0;
        let bn5 = bignum(encryptedSum).mod(publicKey.n);
        while (bn5.lt(0)) bn5 = bn5.add(publicKey.n);
        encryptedSum = publicKey.encrypt(encryptedSum);

        for (let i = 0; i < votes.president.length; i++) {
            encryptedSum = publicKey.addition(votes.president[i], encryptedSum);
            votesArray.push(votes.president[i]);
        }

        for (let j = 0; j < votes.senator.length; j++) {
            encryptedSum = publicKey.addition(votes.senator[j], encryptedSum);
            votesArray.push(votes.senator[j]);
        }

        for (let k = 0; k < votes.stateGovernor.length; k++) {
            encryptedSum = publicKey.addition(votes.stateGovernor[k], encryptedSum);
            votesArray.push(votes.stateGovernor[k]);
        }

        let decryptedSum = privateKey.decrypt(encryptedSum);
        assert(decryptedSum.toString() == voteCount.toString());
    });

    it("Create a proof of result, and test result", () => {
        const [encrypted, proof] = encryptWithProof(publicKey, voteCount, [voteCount], publicKey.bitLength)
        const result = verifyProof(publicKey, encrypted, proof, [voteCount], publicKey.bitLength) // true
        let decrypted = privateKey.decrypt(encrypted);
        assert(result == true && decrypted == voteCount);
    }).timeout(10000000);
});


