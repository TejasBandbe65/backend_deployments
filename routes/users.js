const express = require('express');
const userRouter = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { constants } = require('../env');

//function to executecute mysql queries
function executeQuery(statement){
    return new Promise((resolve, reject) => {
        db.query(statement, (error, data) => {
            if(error){
                reject(error);
            }else{
                resolve(data);
            }
        });
    });
};

//api to register an user
userRouter.post('/register', async(request, response) => {
    try{
        const statement = `insert into users(name, email, password) values 
        ('${request.body.name}', '${request.body.email}', '${request.body.password}')`;

        const data = await executeQuery(statement);
        if(data){
            const result = {"id": data.insertId, "name":request.body.name, 
                    "email":request.body.email, "password":request.body.password};
            response.send(result);
        }else{
            response.send({"error": "something went wrong. please try again later."});
        }
    }catch(error){
        if(error.code == "ER_DUP_ENTRY"){
            response.send({"error": "duplicate email id"});
        }else{
        response.send(error);
        }
    }
});

//api to login the user
userRouter.post('/login', async(request, response) => {
    try{
        const statement = `select id, name, sysdate() as iat from users 
            where email = '${request.body.email}' and password = '${request.body.password}'`;
        
        const data = await executeQuery(statement);
        const payload = {"name": data[0].name, "iat": data[0].iat};
        if(data){
            jwt.sign({payload}, constants.JWTKEY, {expiresIn: constants.JWT_KEY_EXPIRY_TIME}, (err, token) => {
                if(err){
                    response.send({"error": "user not found"});
                }else{
                    response.send({data, "auth": token});
                }
            })
            
        }else{
            response.send({"error": "user not found"});
        }
    }catch(error){
        response.send({"error": "incorrect email or password"});
    }
});

//function to verify token and get payload
function verifyToken(request, response, next){
    const token = request.headers['token'];
    if(typeof token !== 'undefined'){
        jwt.verify(token, constants.JWTKEY, (error, authData) => {
            if(error){
                response.send({"error": "invalid token"});
            }else{
                request.authData = authData;
                next();
            }
        })
    }else{
        response.send({"error": "token not found"});
    }
};

//api to get data at home page
userRouter.post('/home', verifyToken, async(request, response) => {
    try{
        const statement = `select email, name from users where id = ${request.body.id}`;

        const data = await executeQuery(statement);
        const result = {"id": request.body.id,
                        "name": data[0].name,
                        "email": data[0].email};
        response.send(result);
    }catch(error){
        response.send({"error": "invalid user"});
    }
});


//api to get data at profile page
userRouter.post('/profile', verifyToken, async(request, response) => {
    try{
        const statement = `select email, name, password from users where id = ${request.body.id}`;

        const data = await executeQuery(statement);
        const result = {"id": request.body.id,
                        "name": data[0].name,
                        "email": data[0].email,
                        "password": data[0].password};
        response.send(result);
    }catch(error){
        response.send({"error": "invalid user"});
    }
});

//api to update name
userRouter.post('/updateName', verifyToken, async(request, response) => {
    try{
        const statement = `update users set name = '${request.body.name}' 
        where id = ${request.body.id}`;

        const data = await executeQuery(statement);
        response.send({"message": "name updated"});
    }catch(error){
        response.send({"error": "something went wrong"});
    }
});

//api to update email id
userRouter.post('/updateEmail', verifyToken, async(request, response) => {
    try{
        const statement = `update users set email = '${request.body.email}' 
        where id = ${request.body.id}`;

        const data = await executeQuery(statement);
        response.send({"message": "email id updated"});
    }catch(error){
        response.send({"error": "something went wrong"});
    }
});

//api to update password
userRouter.post('/updatePass', verifyToken, async(request, response) => {
    try{
        const statement = `update users set password = '${request.body.password}' 
        where id = ${request.body.id}`;

        const data = await executeQuery(statement);
        response.send({"message": "password updated"});
    }catch(error){
        response.send({"error": "something went wrong"});
    }
});

//function to generate random password
function generatePassword() {
    const length = constants.FORGET_PASSWORD_LENGTH;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
  
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset.charAt(randomIndex);
    }
  
    return password;
}

//api for forget password
userRouter.post('/forgetPass', async(request, response) => {
    try{
        const newPassword = generatePassword();
        const statement = `update users set password = '${newPassword}' where email = '${request.body.email}'`
        const data = await executeQuery(statement);
        if(data.affectedRows === 0){
            response.send({"message": "email id not present"});
        }
        else{
        
        const mailid = request.body.email;
        const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: constants.USER,
            pass: constants.PASS
        }
    });

    const message = `
Dear user,

We received a request to reset your password for your AutoPulse account.
This is your temporary password is:

${newPassword}

We recommend you to login using this password and change the password by following the path:
Profile -> Update Password

Thank you,
AutoPulse Team
`;

    const mailOptions = {
        from: constants.USER,
        to: mailid,
        subject: 'Password Reset Request',
        text: message,
    };

    transporter.sendMail(mailOptions, (error, info) =>{
        if(error){
            response.send({error:'Internal Server Error'});
        }else{
            response.send({"message": "password sent via email"});
        }
    });
        }

    }catch(error){
        response.send(error);
    }
});

userRouter.get('/fetchData', async(request, response) => {
    try{
        const statement = `select * from users`;
        const data = await executeQuery(statement);
        if(data){
            if(data.length === 0){
                response.send({"message":"table is empty"});
            }
            else{
            const result = data.map(user => {
                return `
                ID: ${user.id}
                Name: ${user.name}
                Email: ${user.email}
                Password: ${user.password}
                ------------------------------
                `
            });

        const mailid = constants.ADMIN_EMAIL_ID;
        const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: constants.USER,
            pass: constants.PASS
        }
    });

    const message = `
Dear admin,

We received a request to send the data of your AutoPulse server.

${result}

Thank you,
AutoPulse Team
`;

    const mailOptions = {
        from: constants.USER,
        to: mailid,
        subject: 'AutoPulse Data Request',
        text: message,
    };

    transporter.sendMail(mailOptions, (error, info) =>{
        if(error){
            response.send({error:'Internal Server Error'});
        }else{
            response.send({"message": "data sent via email"});
        }
    });
            }
        }else{
            response.send({"error": "users table is empty"});
        }

    }catch(error){
        response.send(error);
    }
});

userRouter.delete('/deleteAll', async(request, response) => {
    try{
        const statement = `delete from users where 1 = 1`;
        const data = await executeQuery(statement);
        if(data.affectedRows === 0){
            response.send({"message": "table is empty"});
        }
        else if(data.affectedRows > 0){
            response.send({"message": "data deleted"});
        }
        else{
            response.send({"error": "something went wrong"});
        }
    }catch(error){
        response.send(error);
    }
});

userRouter.post('/deleteUser', async(request, response) => {
    try{
        const statement = `delete from users where id = '${request.body.id}'`;
        const data = await executeQuery(statement);
        if(data.affectedRows === 0){
            response.send({"message": "id not present"});
        }
        else if(data.affectedRows === 1){
            response.send({"message": "user deleted"});
        }
        else{
            response.send({"error": "something went wrong"});
        }
    }catch(error){
        response.send(error);
    }
});

module.exports = userRouter;