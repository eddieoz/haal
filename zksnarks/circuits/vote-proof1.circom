include "../../../../../circomlib/circuits/comparators.circom"

template ValidateVotes(pc, sc, sgc) { 	
    signal input presidentTotalCandidates;
    signal input senatorTotalCandidates;
    signal input stateGovernorTotalCandidates;
    
    signal private input presidentTotalVotes;
    signal private input senatorTotalVotes;
    signal private input stateGovernorTotalVotes;
    signal private input totalVotes;
    
    signal private input president[pc];
    signal private input senator[sc];
    signal private input stateGovernor[sgc];

    signal private input voter;
    signal private input signature;
	signal private input p;
	signal private input rcm[2];
    
    signal output outPresidentTotalVotes = 0;
    signal output outSenatorTotalVotes = 0;
    signal output outStateGovernorTotalVotes = 0;
    signal output outTotalVotes = 0;
    
    for (var i=0; i<presidentTotalCandidates; i++) {
        if (president[i] == 1){
            outPresidentTotalVotes+=1;
            outTotalVotes+=1;
            outPresidentTotalVotes === 1; // Constraint allow just one vote
        }
    }

    for (var j=0; j<senatorTotalCandidates; j++) {
        if (senator[j] == 1){
            outSenatorTotalVotes+=1;        
            outTotalVotes+=1;
            outSenatorTotalVotes === 1; // Constraint allow just one vote
        }
    }

    for (var k=0; k<stateGovernorTotalCandidates; k++) {
        if (stateGovernor[k] == 1){
            outStateGovernorTotalVotes+=1;
            outTotalVotes+=1;        
            outStateGovernorTotalVotes === 1; // Constraint allow just one vote
        }
    }
 
    // Test if each pool received correct input
    presidentTotalVotes === 1;
    senatorTotalVotes === 1;    
    stateGovernorTotalVotes === 1;

    // Test the total votes on input and counted
    totalVotes === presidentTotalVotes+senatorTotalVotes+stateGovernorTotalVotes;
    outTotalVotes === outPresidentTotalVotes+outSenatorTotalVotes+outStateGovernorTotalVotes;

    // Trick for comparing an input with an output
    // Must convert the number using this method and comparing after
    component iszA = IsZero();
    iszA.in <== totalVotes - (presidentTotalVotes+senatorTotalVotes+stateGovernorTotalVotes);
    iszA.out === 1;

    component iszB = IsZero();
    iszB.in <== outTotalVotes - (outPresidentTotalVotes+outSenatorTotalVotes+outStateGovernorTotalVotes);
    iszB.out === 1;

    component isequal = IsEqual();
    isequal.in[0] <== iszA.out;
    isequal.in[1] <== iszB.out;
    isequal.out === 1;

    iszB.out === iszA.out;

    // Check if the input total candidates are aligned with the setup
    pc === presidentTotalCandidates;
    sc === senatorTotalCandidates;
    sgc === stateGovernorTotalCandidates;

}
component main = ValidateVotes(4,2,4);