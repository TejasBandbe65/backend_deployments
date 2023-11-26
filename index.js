const express = require('express');
const cors = require('cors');
const usersRouter = require('./routes/users');
const { constants } = require('./env');

const app = express();
app.use(cors('*'));
app.use(express.json());
app.use('/api', usersRouter);

app.listen(constants.SERVER_PORT, '0.0.0.0', () => {
    console.log("server started...")
});