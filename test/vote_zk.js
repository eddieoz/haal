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
const Tx = require('ethereumjs-tx');

// ### Web3 Connection
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'));

// ### Artifacts
const Verifier = artifacts.require('../contracts/HAAL/verifier.sol');
const Haal = artifacts.require('../contracts/HAAL/haal.sol')

const assert = chai.assert;

let verifierAddress = '';
let haalVerifier = '';
let haal = '';
let allAccounts = '';

contract('HAALVerifier', (accounts) => {
    // Creating a collection of tests that should pass
    describe('Install contracts and test', () => {
        beforeEach(async () => {

            // Retrieve the Homomorphic Encryption Key generated on truffle migrate
            // To insert it on the SmartContract
            const publicKey = JSON.parse(fs.readFileSync("test/voteenc_publicKey.json", "utf8"));
            let _publicKey = JSON.stringify({
                'n': stringifyBigInts(publicKey.n.toString()), 
                'g':stringifyBigInts(publicKey.g.toString()), 
                '_n2': stringifyBigInts(publicKey._n2.toString()), 
                'bitLength': publicKey.bitLength
            });

            haalVerifier = await Verifier.new(accounts[0]);
            verifierAbi = await haalVerifier.abi;
            verifierAddress = await haalVerifier.address;
            haal = await Haal.new(web3.utils.toHex('ballot0001'), web3.utils.toHex(_publicKey), verifierAddress);
            allAccounts = accounts;
        });

        it('Test Haal contract', async () => {
            result = await haal.ballotIdentifier().then(function (res) {
                return (res);
            })
            assert.equal('0x62616c6c6f743030303100000000000000000000000000000000000000000000', result.toString());            
        });

        it("Verify zk vote proof on smartcontract", async () => {
            let proof = JSON.parse(fs.readFileSync("./test/circuit/test_trusted_setup/proof.json", "utf8"));
            let publicSignals = JSON.parse(fs.readFileSync("./test/circuit/test_trusted_setup/public.json", "utf8"));
            // generateCall is a fork of snarkjs cli and modified to get the proof to be sent to the smart-contract 
            let verifyCall = await generateCall(publicSignals, proof);
            result = await haalVerifier.verifyProof.call(verifyCall.a, verifyCall.ap, verifyCall.b, verifyCall.bp, verifyCall.c, verifyCall.cp, verifyCall.h, verifyCall.kp, verifyCall.inputs);
            assert.isTrue(result);
        });
    });
});


describe("Create and test an ethereum stealth wallet", () => {
    
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
            scanPrivKey: new Buffer('1ce88522ea4c6927d53799191a6201806d4dce62db69aadd63603cba8d2d8c9f', 'hex'),
            scanPubKey: new Buffer('032caa1a564f7f7e17ca5424d4f17495a8568600add7fc1587198d151bddc23e84', 'hex')
        });

        compressedPubScanKeys = stealth.toString();
        assert.equal(compressedPubScanKeys, 'vJmwnas6bWjz6kerJ1SU52LYxf48GZBdR3tn8haF9pj3dAHqYNsGCgW64WF4k1a1RoNYTko62rsuu4wFbydisaaXCoF7SAtYEqwS2E')

    });

    // it ("Create 2 'fake' ephemeral wallets", async () => {
    //     await haal.enableEphemeralVoter('0x3d5480bf2aeca6c5bc1f142e9525c1655d63ac33', web3Utils.toHex('12341234'), web3Utils.toHex('12341234'));
    //     await haal.enableEphemeralVoter('0x72a78c03a85e4c3d27df25d756f83e504e7e27e9', web3Utils.toHex('43243214'), web3Utils.toHex('43143214'));
    // });

    it("Organizer receives compressedPubScanKeys form voter, creates a random wallet and send to smart-contract", async () => {

        let recoveryFromCompressed = Stealth.fromString(compressedPubScanKeys);

        // single-use nonce key pair, works with CoinKey, bitcoinjs-lib, bitcore, etc
        let keypair = coinkey.createRandom();

        // generate payment address
        ethStealthAddress = ethereum.addHexPrefix(recoveryFromCompressed.genEthPaymentAddress(keypair.privateKey));
        pubKeyToRecover = keypair.publicKey.toString('hex');
        opMarker = recoveryFromCompressed.genPaymentPubKeyHash(keypair.privateKey).toString('hex');

        let canVote = await haal.ephemeralVoters(ethStealthAddress);
        assert.isNotTrue(canVote.canVote);

        // send three outputs to a smart-contract:
        // 1. ETH address
        // 1. Regular pubKeyToRecover
        // 2. Marker with `opMarker`
        await haal.enableEphemeralVoter(ethStealthAddress, web3Utils.toHex(pubKeyToRecover), web3Utils.toHex(opMarker))
        .then( async () => {
            // Must funding ephemeral wallet to enable voting. Could be made by smart-contract too.
            let tx = await web3.eth.sendTransaction({ from: allAccounts[0], to: ethStealthAddress, value: web3.utils.toHex('1000000000000000000') });
            assert.exists(tx.transactionHash);
        });

        assert.isTrue(ethereum.isValidAddress(ethStealthAddress));

    });

    it("Organizer checks if Ephemeral Wallet can vote", async () => {

        let canVote = await haal.ephemeralVoterArray( await haal.ephemeralVoters(ethStealthAddress) );
        assert.isTrue(canVote.canVote);

    });

    it("Voter discovers his ephemeral wallet", async () => {
        let ew, opMarkerBuffer, pubKeyToRecoverBuffer, keypair;
        let ewCount = await haal.countEphemeralWallets();
        
        for ( var i=0; i<ewCount; i++){
            ew = await haal.getEphemeralWallets(i);
            pubKeyToRecoverBuffer = new Buffer(web3.utils.hexToAscii(ew[1]), 'hex');
            opMarkerBuffer = new Buffer(ew[2].slice(2,42), 'hex');

            keypair = stealth.checkPaymentPubKeyHash(pubKeyToRecoverBuffer, opMarkerBuffer);
            if (keypair != null) break;
        }
        
        assert.exists(keypair,'privKey');
        assert.isNotNull(keypair);

    });

    it("Voter recovery private key and send a trasaction", async () => {

        let opMarkerBuffer = new Buffer(opMarker, 'hex');
        let pubKeyToRecoverBuffer = new Buffer(pubKeyToRecover, 'hex');

        let keypair = stealth.checkPaymentPubKeyHash(pubKeyToRecoverBuffer, opMarkerBuffer);

        //let PrivateToPublic = ethereum.privateToPublic(keypair.privKey).toString('hex');
        let ethAddress = '0x' + ethereum.privateToAddress(keypair.privKey).toString('hex');

        // Lets use the recovered private key to access the wallet and prove it can send some funds
        let privateKey = new Buffer(keypair.privKey, 'hex')
        
        let rawTx = {
            nonce: '0x00',
            from: ethAddress, 
            to: allAccounts[2],
            gasPrice: '0x09184e72a000',
            gasLimit: '0x2710',
            gas: web3.utils.toHex('50000'),
            value: web3.utils.toHex('10000000000000000')
            }

        let unsignedTx = new Tx(rawTx);
        unsignedTx.sign(privateKey);

        let serializedTx = unsignedTx.serialize();
        let tx = await web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
        //.on('receipt', console.log)
        
        assert.exists(tx.transactionHash);
        assert.equal(ethAddress, ethStealthAddress);
    });
    
});



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
        setup = zkSnark.original.setup(circuit);
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
        proof = zkSnark.original.genProof(vk_proof, witness);
        assert.equal(proof.proof.protocol, "original");
    });

    it("Verify vote proof", () => {
        // Verify the proof
        const vk_verifier = setup.vk_verifier;
        assert.isTrue(zkSnark.original.isValid(vk_verifier, proof.proof, proof.publicSignals));
    }).timeout(10000000);
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

    // Randomly creates the Homomorphic Crypto Keys
    //const { publicKey, privateKey } = paillier.generateRandomKeys(1024);
    let publicKey = ''; 
    let privateKey = '';

    it("Encrypt votes", async () => {
        // Retrieve Homomorphic Encryption Keys generated on Truffle Migrate
        // const _publicKey = JSON.parse(fs.readFileSync("test/voteenc_publicKey.json", "utf8"));
        // const publicKey = new paillier.PublicKey(bignum(_publicKey.n), bignum(_publicKey.g));

        // Retrieve Homomorphic Encryption Key from smart-contract
        let result = await haal.encryptionPublicKey().then(function (res) {
            return (web3.utils.hexToAscii(res));
        })
        const _publicKey = JSON.parse(result);
        publicKey = new paillier.PublicKey(bignum(_publicKey.n), bignum(_publicKey.g));
        assert(publicKey.bitLength == '1024')

        for (let i = 0; i < votes.president.length; i++) {
            voteCount += votes.president[i];
            // convert vote to bignum
            //let bn1 = bignum(votes.president[i]).mod(publicKey.n);
            let bn1 = bignum(votes.president[i]);
            bn1 = bn1.mod(publicKey.n);
            while (bn1.lt(0)) bn1 = bn1.add(publicKey.n);  // bug in bignum? mod(n) of negative number returns .abs().mod(n). This should fix it
            // encrypt the vote with published pk
            paillier.PublicKey.apply
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
        
        // Retrieve Homomorphic Private Key from local storage
        const _privateKey = JSON.parse(fs.readFileSync("test/voteenc_privateKey.json", "utf8"));
        privateKey = new paillier.PrivateKey(bignum(_privateKey.lambda), bignum(_privateKey.mu), bignum(_privateKey.p), bignum(_privateKey.q), bignum(_privateKey.publicKey));

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
        // Creates a proof of result, encrypting with public key recovered on the smart-contract
        // Public key is used for testing and verifying the result
        // Decrypts using private key recovered from storage

        const [encrypted, proof] = encryptWithProof(publicKey, voteCount, [voteCount], publicKey.bitLength)
        const result = verifyProof(publicKey, encrypted, proof, [voteCount], publicKey.bitLength) // true
        let decrypted = privateKey.decrypt(encrypted);
        assert(result == true && decrypted == voteCount);
    }).timeout(10000000);
});


