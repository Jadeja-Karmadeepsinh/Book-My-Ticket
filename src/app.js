import express, { urlencoded } from 'express';
//here all the routes will come auth, movies, etc
import listEndpoints from 'express-list-endpoints';

const app = express();
app.use(express.json());
app.use(urlencoded({ extended: true }));
//express.urlencoded()
// This is simply a built-in middleware.
// It reads form data sent by HTML forms.
// Now add app.use(express.urlencoded({ extended: true }));
// Now Express converts email=abc@gmail.com&password=123456 into
// {
//     email: "abc@gmail.com",
//     password: "123456"
// }


//here the routes will go 
// app.use('/auth', authRoute);

console.log(listEndpoints(app));

export default app;
