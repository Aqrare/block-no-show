// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ReservationManager is ReentrancyGuard {
    IERC20 public depositToken;

    struct Reservation {
        uint256 id;
        address user;
        string restaurant;
        uint256 timestamp;
        uint8 people;
        uint256 deposit;
        bool isActive;
        bool isCheckedIn;
    }

    mapping(uint256 => Reservation) public reservations;
    mapping(address => uint256[]) public userReservations;
    uint256 private nextReservationId = 1;

    event ReservationCreated(uint256 indexed id, address indexed user, string restaurant, uint256 timestamp, uint8 people, uint256 deposit);
    event ReservationChanged(uint256 indexed id, uint256 newTimestamp, uint8 newPeople);
    event ReservationCancelled(uint256 indexed id);
    event CheckedIn(uint256 indexed id);
    event DepositWithdrawn(uint256 indexed id, address indexed user, uint256 amount);

    constructor(address _depositToken) {
        depositToken = IERC20(_depositToken);
    }

    function createReservation(string memory _restaurant, uint256 _timestamp, uint8 _people, uint256 _deposit) external nonReentrant {
        require(_timestamp > block.timestamp, "Reservation date must be in the future");
        require(_people > 0, "Number of people must be greater than 0");
        require(_deposit > 0, "Deposit must be greater than 0");
        require(depositToken.transferFrom(msg.sender, address(this), _deposit), "Deposit transfer failed");

        uint256 reservationId = nextReservationId++;
        Reservation memory newReservation = Reservation(
            reservationId,
            msg.sender,
            _restaurant,
            _timestamp,
            _people,
            _deposit,
            true,
            false
        );

        reservations[reservationId] = newReservation;
        userReservations[msg.sender].push(reservationId);

        emit ReservationCreated(reservationId, msg.sender, _restaurant, _timestamp, _people, _deposit);
    }

    function changeReservation(uint256 _id, uint256 _newTimestamp, uint8 _newPeople) external {
        Reservation storage reservation = reservations[_id];
        require(reservation.user == msg.sender, "Not the reservation owner");
        require(reservation.isActive, "Reservation is not active");
        require(!reservation.isCheckedIn, "Already checked in");
        require(_newTimestamp > block.timestamp, "New date must be in the future");
        require(_newPeople > 0, "New number of people must be greater than 0");

        reservation.timestamp = _newTimestamp;
        reservation.people = _newPeople;

        emit ReservationChanged(_id, _newTimestamp, _newPeople);
    }

    function cancelReservation(uint256 _id) external nonReentrant {
        Reservation storage reservation = reservations[_id];
        require(reservation.user == msg.sender, "Not the reservation owner");
        require(reservation.isActive, "Reservation is not active");
        require(!reservation.isCheckedIn, "Already checked in");

        reservation.isActive = false;

        // Return the deposit to the user
        require(depositToken.transfer(msg.sender, reservation.deposit), "Deposit return failed");

        emit ReservationCancelled(_id);
    }

    function checkIn(uint256 _id) external {
        Reservation storage reservation = reservations[_id];
        require(reservation.isActive, "Reservation is not active");
        require(!reservation.isCheckedIn, "Already checked in");
        require(block.timestamp <= reservation.timestamp + 1 hours, "Check-in time expired");

        reservation.isCheckedIn = true;

        emit CheckedIn(_id);
    }

    function withdraw(uint256 _id) external nonReentrant {
        Reservation storage reservation = reservations[_id];
        require(reservation.user == msg.sender, "Not the reservation owner");
        require(reservation.isCheckedIn, "Not checked in");
        require(reservation.deposit > 0, "No deposit to withdraw");

        uint256 amount = reservation.deposit;
        reservation.deposit = 0;

        require(depositToken.transfer(msg.sender, amount), "Withdraw transfer failed");

        emit DepositWithdrawn(_id, msg.sender, amount);
    }

    function getUserReservations(address _user) external view returns (uint256[] memory) {
        return userReservations[_user];
    }

    function getReservation(uint256 _id) external view returns (Reservation memory) {
        return reservations[_id];
    }
}