const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();

app.use("/css", express.static(__dirname + "/public/css"))
app.use("/js", express.static(__dirname + "/public/js"))
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    let accessToken = req.query.accessToken ? req.query.accessToken : req.cookies.accessToken;
    if(accessToken){
        res.redirect('/index?accessToken=' + accessToken);
    }
    else{
        res.render('login');
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const response = await axios.post('https://qa2.sunbasedata.com/sunbase/portal/api/assignment_auth.jsp', {
            login_id : email,
            password : password,
        });
        res.redirect('/index?accessToken=' + response.data.access_token);
    } catch (error) {
        res.status(401).json({ error: 'Authentication failed' });
    }
});

app.get('/index', async (req, res) => {
    let accessToken = req.query.accessToken ? req.query.accessToken : req.cookies.accessToken;
    if (!accessToken) {
        res.redirect('/login');
    }
    else{
        res.cookie('accessToken', accessToken);
        const customerList = await axios.get('https://qa2.sunbasedata.com/sunbase/portal/api/assignment.jsp?cmd=get_customer_list', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        res.render('index', {customerList: customerList.data});
    }
});

app.get('/add-user', async (req, res) => {
    let accessToken = req.query.accessToken ? req.query.accessToken : req.cookies.accessToken;
    if(!accessToken){
        res.redirect('/login');
    }
    res.render('add_user');
});

app.post('/add-user', async (req, res) => {
    let accessToken = req.cookies.accessToken;
    if(!accessToken){
        res.redirect('/login');
    }
    const { first_name, last_name, street, address, city, state, email, phone } = req.body;
    const payload = {
        first_name, last_name, street, address, city, state, email, phone
    }
    try {
        let response = await axios.post('https://qa2.sunbasedata.com/sunbase/portal/api/assignment.jsp?cmd=create', payload,{
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })
        if (response.status === 201) {
            res.redirect('/index?accessToken=' + accessToken);
        }
        else if (response.status === 400) {
            res.status(400).send('First Name or Last Name is missing')
            setTimeout(() => {
                res.redirect('/add-user?accessToken=' + accessToken);
            }, 1500);
        }
    } catch(error) {
        res.status(500).send('An error occurred while adding Customer')
        setTimeout(() => {
            res.redirect('/index?accessToken=' + accessToken);
        }, 1500);
    }
});

app.get('/update-user', async (req, res) => {
    let accessToken = req.query.accessToken ? req.query.accessToken : req.cookies.accessToken;
    let uuid = req.query.uuid;
    const customerList = await axios.get('https://qa2.sunbasedata.com/sunbase/portal/api/assignment.jsp?cmd=get_customer_list', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    let customer = customerList.data.filter((customer) => {
        return customer.uuid === uuid;
    });
    res.render('update_user', {customer: customer[0]});
});

app.post('/update-user', async (req, res) => {
    let accessToken = req.cookies.accessToken;
    if(!accessToken){
        res.redirect('/login');
    }
    let payload = {
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        street: req.body.street,
        address: req.body.address,
        city: req.body.city,
        state: req.body.state,
        email: req.body.email,
        phone: req.body.phone
    }
    try{
        let response = await axios.post('https://qa2.sunbasedata.com/sunbase/portal/api/assignment.jsp?cmd=update&uuid='+req.body.uuid, payload,{
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        if (response.status === 200) {
            res.redirect('/index?accessToken=' + accessToken);
        }
        else if (response.status === 500) {
            res.status(500).send('UUID is missing');
            setTimeout(() => {
                res.redirect('/update-user?accessToken=' + accessToken + '&uuid=' + req.body.uuid);
            }, 1500);
        }
        else if (response.status === 400) {
            res.status(400).send('First Name or Last Name is missing');
            setTimeout(() => {
                res.redirect('/update-user?accessToken=' + accessToken + '&uuid=' + req.body.uuid);
            }, 1500);
        }
    } catch(error) {
        res.status(500).send('An error occurred')
        setTimeout(() => {
            res.redirect('/index?accessToken=' + accessToken);
        }, 1500);
    }
});

app.get('/delete-user', async (req, res) => {
    let uuid = req.query.uuid;
    let accessToken = req.query.accessToken ? req.query.accessToken : req.cookies.accessToken;
    if(!accessToken){
        res.redirect('/login');
    }
    try{
        let response = await axios.post('https://qa2.sunbasedata.com/sunbase/portal/api/assignment.jsp?cmd=delete&uuid='+uuid, {},{
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        if (response.status === 200) {
            res.redirect('/index?accessToken=' + accessToken);
        }
        else if (response.status === 500) {
            res.status(500).send('Error not deleted');
            setTimeout(() => {
                res.redirect('/index?accessToken=' + accessToken);
            }, 1500);
        }
        else if (response.status === 400) {
            res.status(400).send('UUID not found');
            setTimeout(() => {
                res.redirect('/index?accessToken=' + accessToken);
            }, 1500);
        }
    } catch (error) {
        res.status(500).send('An error occurred')
    }
});

app.get('/logout', (req, res) => {
    res.clearCookie('accessToken');
    res.redirect('/login');
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

