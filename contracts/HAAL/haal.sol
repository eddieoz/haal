pragma solidity ^0.4.24;

contract Haal {
    struct Votes{
        uint[] president;
        uint[] senator;
        uint[] stateGovernor;
        bytes32 c;
    }
    struct Voter {
        bytes32 pubKeyToRecover;
        bytes32 opMarker;
        bool canVote;
        bool voted;
    }
    
    mapping(address => Voter) public voters;
    mapping(address => Votes) public votes;
    
    address public owner; // there's no access control implemented on this demo
    bytes32 ballotIdentifier;
    uint public votersCount;
    uint public votesCount;
    
    constructor(bytes32 _ballotIdentifier) public {
        owner = msg.sender;
        ballotIdentifier = _ballotIdentifier;
    }
    
    function vote(uint256[] memory _president, uint[] memory _senator, uint[] memory _stateGovernor, bytes32 _c) public {
        Voter storage sender = voters[msg.sender];
        if (sender.voted || !sender.canVote) return;
        
        votes[msg.sender].president = _president;
        votes[msg.sender].senator = _senator;
        votes[msg.sender].stateGovernor = _stateGovernor;
        votes[msg.sender].c = _c;
        votesCount+=1;
        
        sender.voted = true;
        sender.canVote = false;
    }
    
    function enableVoter(bytes32 _pubKeyToRecover, bytes32 _opMarker) public {
        Voter storage sender = voters[msg.sender];
        if (sender.voted) return;
        
        sender.pubKeyToRecover = _pubKeyToRecover;
        sender.opMarker = _opMarker;
        sender.canVote = true;
        votersCount+=1;
    }
    
}