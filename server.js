const express = require('express');
const path = require('path');
const csrf = require('csurf')
const flash = require('connect-flash')
const mongoose = require('mongoose');
const Handlebars = require('handlebars');
const exphbs = require('express-handlebars');
const {allowInsecurePrototypeAccess} = require('@handlebars/allow-prototype-access');
const session = require('express-session')
const MongoStore = require('connect-mongodb-session')(session)
const ordersRoutes = require('./routes/orders')
const authRoutes = require('./routes/auth')
const homeRoutes = require('./routes/home');
const addRoutes = require('./routes/add');
const coursesRoutes = require('./routes/courses');
const cartRoutes = require('./routes/cart');
const profileRoutes = require('./routes/profile')
const varMiddleware = require('./middleware/variables')
const userMiddleware = require('./middleware/user')
const errorHandler = require('./middleware/error')
const fileMiddleware = require('./middleware/file')
const keys = require('./keys')
const helpers = require('./utils/hbs-helpers')

const app = express();

const hbs = exphbs.create({
    // Основной layout в папке layouts
    defaultLayout: 'main',
    // Чтобы не писать расширение handlebars
    extname: 'hbs',
    // Решаем проблему handlebars runtime c express-handlebars
    handlebars: allowInsecurePrototypeAccess(Handlebars),
    // Функции помощники для hbs
    helpers
});

// Создаем переменную хранилища сессий для бд mongodb
const store = new MongoStore({
    collection: 'sessions',
    uri: keys.MONGODB_URI
})

// Регистрируем модуль hbs как движок для рендеринга html страниц
// регистрация движка с названием 'hbs'
app.engine('hbs', hbs.engine);
// Установка движка с названием 'hbs' для использования
app.set('view engine', 'hbs');
// Можно указать папку, где будут храниться все шаблоны (по умолчанию views)
app.set('views', 'views');

// Добавление функциональности
// Указываем папку public в качестве источника для кастомных скриптов
app.use(express.static(path.join(__dirname, 'public')));
// Указываем папку images (для аватарок) как статическую, первым параметром указываем путь, по которому будут доступны файлы
app.use('/images', express.static(path.join(__dirname, 'images')))

app.use(express.urlencoded({
    extended: true
}));

// Подключаем express-session с параметрами
app.use(session({
    //строка на основе которой будет происходить шифрование
    secret: keys.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    // хранилище сессий для пакета connect-mongodb-session
    store
}))
// подключаем fileMiddleware сразу после сессии, но перед csrf
// single говорит о том, что загружается один файл, avatar - название поля 
app.use(fileMiddleware.single('avatar'))
// Добавляем CSRF - защиту (сразу после сессии)
app.use(csrf())
// добавляем flash для передачи возможных сообщений об ошибках в render (после сиссии)
app.use(flash())
// Используем свой middleware для добавления поля isAuth - проверка аутентификации
app.use(varMiddleware)
// Используем свой middleware, чтобы данные пользователя прилетали как модель mongoose, а не как объект с данными (из session)
app.use(userMiddleware)

// Передаем объекту запроса пользователя по его id 
// app.use(async (req, res, next) => {
//     try {
//         const user = await User.findById('5f4260096e64031c6c26103a')

//         req.user = user

//         // Метод, продолжающий выполнение всех остальных app.use 
//         next()
//     } catch (e) {
//         console.log(e)
//     }
// })

// Подключаем роуты
app.use('/', homeRoutes);
app.use('/add', addRoutes);
app.use('/courses', coursesRoutes);
app.use('/cart', cartRoutes);
app.use('/orders', ordersRoutes)
app.use('/auth', authRoutes)
app.use('/profile', profileRoutes)
// errorHandler для 404 ошибки подключаем после всех роутов
app.use(errorHandler)

async function start () {
    try {
        // Подключение к бд
        await mongoose.connect(keys.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useFindAndModify: false
        });

        // Создаем пользователя

        // Если есть хотя бы один пользователь, то метод findOne без параметров хотя бы что-то вернет
        // const candidate = await User.findOne()

        // if (!candidate) {
        //     // Создаем пользователя
        //     const user = new User({
        //         email: 'alexander@mail.ru',
        //         name: 'Alexander',
        //         cart: {items: []}
        //     })
        //     // Сохраняем пользователя
        //     await user.save()
        // }

        // После подключения к бд запускаем приложение
        // Слушаем порт
        const PORT = process.env.PORT || 3000;

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`)
        });
    } catch (e) {
        console.log(e)
    }
};

start();

