pragma solidity ^0.4.25;

contract Verify { 
    function verifyProof( uint[2], uint[2], uint[2][2], uint[2], uint[2], uint[2], uint[2], uint[2], uint[7]) external pure returns (bool){} 
}

contract Haal {
    struct Votes{
        uint[] president;
        uint[] senator;
        uint[] stateGovernor;
        bytes32 c;
    }
    
    struct EphemeralVoter {
        address ephemeralWallet;
        bytes32 pubKeyToRecover;
        bytes32 opMarker;
        bool canVote;
        bool voted;
    }
    
    struct RealVoter {
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
    
    mapping(address => EphemeralVoter) public ephemeralVoters;
    mapping(address => Votes) public votes;
    mapping(address => RealVoter) public realVoters;
    
    EphemeralVoter public ev;
    RealVoter public rv;
    Votes public v;

    address public owner; // there's no access control implemented on this demo
    address public zkVerifier;
    bytes32 public ballotIdentifier;
    bytes public encryptionPublicKey; // better if converted to hex
    uint public votersCount;
    uint public votesCount;
    uint public voteProofs;
    
    constructor(bytes32 _ballotIdentifier, bytes _encryptionPublicKey, address _zkVerifier) public {
        owner = msg.sender;
        ballotIdentifier = _ballotIdentifier;
        encryptionPublicKey = _encryptionPublicKey;
        zkVerifier = _zkVerifier;
    }
    
    function vote(uint256[] memory _president, uint[] memory _senator, uint[] memory _stateGovernor, bytes32 _c) public returns(bool){
        EphemeralVoter storage sender = ephemeralVoters[msg.sender];
        if (sender.voted || !sender.canVote) return(false);
        
        votes[msg.sender].president = _president;
        votes[msg.sender].senator = _senator;
        votes[msg.sender].stateGovernor = _stateGovernor;
        votes[msg.sender].c = _c;
        votesCount+=1;
        
        sender.voted = true;
        sender.canVote = false;
        return(true);
    }
    
    function enableEphemeralVoter(bytes32 _pubKeyToRecover, bytes32 _opMarker) public returns (bool){
        EphemeralVoter storage sender = ephemeralVoters[msg.sender];
        if (sender.voted) return(false);
        
        sender.pubKeyToRecover = _pubKeyToRecover;
        sender.opMarker = _opMarker;
        sender.canVote = true;
        votersCount+=1;
        return(true);
    }
    
    function registerVoteProof(
        uint[2] _a,
        uint[2] _a_p,
        uint[2][2] _b,
        uint[2] _b_p,
        uint[2] _c,
        uint[2] _c_p,
        uint[2] _h,
        uint[2] _k,
        uint[7] _input
        ) public returns (bool){
        
        RealVoter storage sender = realVoters[msg.sender];
        if (sender.voted) return(false);
        
        Verify verifier = Verify(zkVerifier);
        if (!verifier.verifyProof(_a, _a_p, _b, _b_p, _c, _c_p, _h, _k, _input)) return (false);
        
        sender.a = _a;
        sender.a_p = _a_p;
        sender.b = _b;
        sender.b_p = _b_p;
        sender.c = _c;
        sender.c_p = _c_p;
        sender.h = _h;
        sender.k = _k;
        sender.input = _input;
        
        sender.voted = true;
        voteProofs+=1;
        return(true);
    }        
    
}