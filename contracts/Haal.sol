pragma solidity ^0.4.25;
pragma experimental ABIEncoderV2;

contract Verify { 
    function verifyProof( uint[2], uint[2], uint[2][2], uint[2], uint[2], uint[2], uint[2], uint[2], uint[7]) external pure returns (bool){} 
}

contract Haal {
    struct Votes{
        bytes[] president;
        bytes[] senator;
        bytes[] stateGovernor;
        bytes32 c;
    }
    
    struct EphemeralVoter {
        address ephemeralAddress;
        bytes pubKeyToRecover;
        bytes32 opMarker;
        bool canVote;
        bool voted;
    }
    
    struct RealVoter {
        address realVoterAddress;
        uint[2] a;
        uint[2] a_p;
        uint[2][2] b;
        uint[2] b_p;
        uint[2] c;
        uint[2] c_p;
        uint[2] h;
        uint[2] k;
        uint[7] input;
        bool voted;
    }
    
    struct Result{
        uint[] president;
        uint[] senator;
        uint[] stateGovernor;
        bytes32[] encryptedResult;
        bytes32[] proof;
    }
    
    EphemeralVoter[] public ephemeralVoterArray;
    Votes[] voteArray;
    RealVoter[] realVoterArray;
    
    // Struct indexes
    mapping(address => uint) public ephemeralVoters;
    mapping(address => uint) public votes;
    mapping(address => uint) public realVoters;

    address public owner; // there's no access control implemented on this demo
    address public zkVerifier;
    bytes32 public ballotIdentifier;
    bytes public encryptionPublicKey; // better if converted to hex
    uint public votersCount;
    uint public votesCount;
    uint public voteProofs;
    
    constructor(
        bytes32 _ballotIdentifier, 
        bytes _encryptionPublicKey, 
        address _zkVerifier
        ) public {
        owner = msg.sender;
        ballotIdentifier = _ballotIdentifier;
        encryptionPublicKey = _encryptionPublicKey;
        zkVerifier = _zkVerifier;
    }
    
    function addEphemeralVoter(
        address _address, 
        bytes _pubKeyToRecover, 
        bytes32 _opMarker
        ) public returns(bool){
        
        ephemeralVoterArray.length++;
        ephemeralVoterArray[ephemeralVoterArray.length-1].ephemeralAddress = _address;
        ephemeralVoterArray[ephemeralVoterArray.length-1].pubKeyToRecover = _pubKeyToRecover;
        ephemeralVoterArray[ephemeralVoterArray.length-1].opMarker = _opMarker;
        ephemeralVoterArray[ephemeralVoterArray.length-1].canVote = true;
        
        ephemeralVoters[_address] = ephemeralVoterArray.length-1;
        
        votersCount+=1;
        return(true);
    }
    
    function addVote(
        bytes[] _president, 
        bytes[] _senator, 
        bytes[] _stateGovernor,
        bytes32 _c
        ) public returns(bool){
        
        //EphemeralVoter storage sender = ephemeralVoters[msg.sender];
        EphemeralVoter storage sender = ephemeralVoterArray[ephemeralVoters[msg.sender]];
        if (sender.voted || !sender.canVote) return(false);
        
        voteArray.length++;
        voteArray[voteArray.length-1].president = _president;
        voteArray[voteArray.length-1].senator = _senator;
        voteArray[voteArray.length-1].stateGovernor = _stateGovernor;
        voteArray[voteArray.length-1].c = _c;
        
        votes[msg.sender] = voteArray.length-1;
        
        votesCount+=1;
        
        sender.voted = true;
        sender.canVote = false;
        return(true);
    }
    
    function registerVoteProof(
        uint[2] memory _a,
        uint[2] memory _a_p,
        uint[2][2] memory _b,
        uint[2] memory _b_p,
        uint[2] memory _c,
        uint[2] memory _c_p,
        uint[2] memory _h,
        uint[2] memory _k,
        uint[7] memory _input
        ) public returns (bool){
        
        RealVoter storage sender = realVoterArray[realVoters[msg.sender]];
        if (sender.voted) return(false);
        
        Verify verifier = Verify(zkVerifier);
        if (!verifier.verifyProof(_a, _a_p, _b, _b_p, _c, _c_p, _h, _k, _input)) return (false);
        
        realVoterArray.length++;
        
        realVoterArray[realVoterArray.length-1].realVoterAddress = msg.sender;
        realVoterArray[realVoterArray.length-1].a = _a;
        realVoterArray[realVoterArray.length-1].a_p = _a_p;
        realVoterArray[realVoterArray.length-1].b = _b;
        realVoterArray[realVoterArray.length-1].b_p = _b_p;
        realVoterArray[realVoterArray.length-1].c = _c;
        realVoterArray[realVoterArray.length-1].c_p = _c_p;
        realVoterArray[realVoterArray.length-1].h = _h;
        realVoterArray[realVoterArray.length-1].k = _k;
        realVoterArray[realVoterArray.length-1].input = _input;
        realVoterArray[realVoterArray.length-1].voted = true;
        
        realVoters[msg.sender] = realVoterArray.length-1;
        
        voteProofs+=1;
        return(true);
    }
        
    function getEphemeralWallets(uint _index) view public returns(address, bytes, bytes32){
        return(
            ephemeralVoterArray[_index].ephemeralAddress, 
            ephemeralVoterArray[_index].pubKeyToRecover, 
            ephemeralVoterArray[_index].opMarker
            );
    }
    
    function getVotes(uint _index) view public returns(bytes[], bytes[], bytes[]){
        return(
            voteArray[_index].president, 
            voteArray[_index].senator, 
            voteArray[_index].stateGovernor
            );
    }
    
}