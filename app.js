// Since there are 80 seats in a coach of a train with only 7 seats in a row 
// last row contains 3 seats
// so our coach structure should look like below

/*

1 2 3 4 5 6 7
8 9 10 11 12 13 14
15 16 17 18 19 20 21
.....
.....
.....
78 79 80

*/



/* 


some assumptions 

since there is no login functionality to be create

assuming there is unique userid for each user who are trying to book seats

it is necessary because we have to maintain the booked ticket record in database

our table will be like this

ticket_reservation_log(
	id int NOT NULL auto_increment primary key,
    booked_by varchar(255) not null,
    seat int not null,
    booked_on date not null
) 

since we are not input any date 
so assuming booking is done for the current date only


*/ 


/* logic for the booking ticket 

We have to book ticket this way that the priority will be to book them in one row 
If seats are not available in one row then the booking should be done in such a way that the
nearby seats are booked.


first we fetch the booked ticket for the current date from database

then check if vacant seats > no of seat to be booked

if false then simply send message that seats are not available

if true then

loop through each row and check if the seat is booked or not 
if booked then continue and if seat is vacant then save the data in database (booked_by : userid,seat_number: seat_number,date:currentDate)

Since we are booking this way that priority will be to book them in one row 


initially all seats are vacant

and suppose if any user book 5 tickets

so the seats provided to that user will be 1 2 3 4 5


and if any different user book 6 tickets

so the seats provide to that user will be 

8 9 10 11 12 13 14

so basically first we have to find that if any row has vacant seats which is greater than the number of seats to be booked

if we do not find any such row

then we have to loop through each row and assign the seat which is vacant

*/
const express = require('express')

const app = express()

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, PUT");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next();
})

const port = 3600
const seatPosition = [];

app.listen(port, function() {
  console.log('Listening on ' + port + '.')
})

const mysql = require('mysql2');

const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "admin",
    database : "reservation"
});
  
con.connect(function(err) {
if (err) throw err;
console.log("Connected!");
});

const moment = require('moment');

function initializeSeatPositionArray(){
    const rows = 11; // Math.floor(80/7)
    
    for(let i =1;i<=rows;i++){
        seatPosition.push(Array(7).fill(0)) // intialize array with 7 seat in a row and create 11 row
    }

    seatPosition.push(Array(3).fill(0)) // in last row there will be only 3 seats
    
    let counter = 1;

    for(let i =0 ;i<seatPosition.length;i++){
        for(let j=0;j<seatPosition[i].length;j++){
            seatPosition[i][j] = counter;
            counter++;
        }
    }
}

initializeSeatPositionArray();

function reserveTicket(bookedTicket,numberofSeats){
    let bookedSeats = bookedTicket.map((ele)=>ele.seat);
    let currentBookingSeats = [];

    for (let i = 0; i < seatPosition.length; i++) {
        let row = seatPosition[i];
        let startIndex = -1;
  
        for (let j = 0; j < row.length; j++) {
          if (bookedSeats.indexOf(row[j]) == -1) { // check if seat is already booked or not
            if (startIndex === -1) { // starting position of the booked seat
              startIndex = j;
            }
            
            if (j - startIndex + 1 == numberofSeats) {  // check if all seat can be reserved in one row
              for (let k = startIndex; k <= j; k++) {
                currentBookingSeats.push({"seat" : row[k]})
              }
              //console.log("booked in single row");
              return currentBookingSeats;
            }
          } else {
            startIndex = -1;
          }
        }
      }
      //console.log("could not book in a single row");
    // If not all seats can be reserved in a single row, reserve nearby seats

    let remainingSeats = numberofSeats;
    for (let i = 0; i < seatPosition.length; i++) {
        let row = seatPosition[i];
        for (let j = 0; j < row.length; j++) {
          if (remainingSeats === 0) {
            break;
          }
          if (bookedSeats.indexOf(row[j])==-1) {
            currentBookingSeats.push({"seat":row[j]})
            remainingSeats--;
          }
        }
    }

    if (remainingSeats === 0) { // all seats have been reserved successfully
        return currentBookingSeats;
    } else {
        return []; // if all seats could not reserve then return blank array
    }
}

app.route('/book-ticket').get(async (req, res) => {
    let numberOfSeatToBeBooked = req.query && req.query.numberOfSeat;
    let userid = req.query && req.query.userid;
    // check if there is already ticket booked for current date

    if(numberOfSeatToBeBooked <=0 || numberOfSeatToBeBooked >7){
        res.send(['Invalid Input'])
        return;
    }
    con.query(`select * from ticket_reservation_log where booked_on = '${moment().format('YYYY-MM-DD')}'`, function (err, result) {
        if (err) throw err;
        let bookedTicket = reserveTicket(result,numberOfSeatToBeBooked);
        bookedTicket = bookedTicket.map((ele)=>{return {"booked_by" : userid,"booked_on" : moment().format('YYYY-MM-DD'),"seat" : ele.seat}});
        if(bookedTicket.length){
            // insert in the database
            let sqlQuery = `insert into ticket_reservation_log (booked_by,seat,booked_on) values `;
            for(let i=0;i<bookedTicket.length;i++){
                sqlQuery += `('${bookedTicket[i].booked_by}',${bookedTicket[i].seat},'${bookedTicket[i].booked_on}') `
                if(i!=bookedTicket.length-1){
                    sqlQuery += ','
                }
            }
            con.query(sqlQuery, function (err, result) {
                if (err) throw err;
                res.send(bookedTicket.map(ele=>ele.seat));
            });
        } else{
            res.send(["Sorry, tickets are not available"])
        }
    });
})

    