/* forked from snarkjs cli */
const {stringifyBigInts, unstringifyBigInts} = require("../node_modules/snarkjs/src/stringifybigint.js");

function p256(n) {
    let nstr = n.toString(16);
    while (nstr.length < 64) nstr = "0"+nstr;
    nstr = `0x${nstr}`;
    return nstr;
}

function generateCall(publicSignals, proof){
    
    publicSignals = unstringifyBigInts(publicSignals);
    proof = unstringifyBigInts(proof);
    
    let inputs = [];

    for (let i=0; i<publicSignals.length; i++) {
        inputs.push(p256(publicSignals[i])) 
    }

    let S;
    if ((typeof proof.protocol === "undefined") || (proof.protocol == "original")) {
        // S=`[${p256(proof.pi_a[0])}, ${p256(proof.pi_a[1])}],` +
        //     `[${p256(proof.pi_ap[0])}, ${p256(proof.pi_ap[1])}],` +
        //     `[[${p256(proof.pi_b[0][1])}, ${p256(proof.pi_b[0][0])}],[${p256(proof.pi_b[1][1])}, ${p256(proof.pi_b[1][0])}]],` +
        //     `[${p256(proof.pi_bp[0])}, ${p256(proof.pi_bp[1])}],` +
        //     `[${p256(proof.pi_c[0])}, ${p256(proof.pi_c[1])}],` +
        //     `[${p256(proof.pi_cp[0])}, ${p256(proof.pi_cp[1])}],` +
        //     `[${p256(proof.pi_h[0])}, ${p256(proof.pi_h[1])}],` +
        //     `[${p256(proof.pi_kp[0])}, ${p256(proof.pi_kp[1])}],` +
        //     `[${inputs}]`;
            return(
                {"a": [p256(proof.pi_a[0]), p256(proof.pi_a[1])],
                "ap": [p256(proof.pi_ap[0]), p256(proof.pi_ap[1])],
                "b":  [[p256(proof.pi_b[0][1]), p256(proof.pi_b[0][0])],[p256(proof.pi_b[1][1]), p256(proof.pi_b[1][0])]],
                "bp": [p256(proof.pi_bp[0]), p256(proof.pi_bp[1])],
                "c":  [p256(proof.pi_c[0]), p256(proof.pi_c[1])],
                "cp": [p256(proof.pi_cp[0]), p256(proof.pi_cp[1])],
                "h":  [p256(proof.pi_h[0]), p256(proof.pi_h[1])],
                "kp": [p256(proof.pi_kp[0]), p256(proof.pi_kp[1])],
                "inputs": inputs }
            );            
    } else if (proof.protocol == "groth") {
        S=`[${p256(proof.pi_a[0])}, ${p256(proof.pi_a[1])}],` +
            `[[${p256(proof.pi_b[0][1])}, ${p256(proof.pi_b[0][0])}],[${p256(proof.pi_b[1][1])}, ${p256(proof.pi_b[1][0])}]],` +
            `[${p256(proof.pi_c[0])}, ${p256(proof.pi_c[1])}],` +
            `[${inputs}]`;
    } else {
        throw new Error("InvalidProof");
    }
    //console.log(S);
    return(S);
};

module.exports = generateCall;
