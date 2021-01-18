const multer = require('multer')

// определяем куда и как нам сохранять загружаемые файлы
const storage = multer.diskStorage({
    destination(req, file, cb) {
        //callback первым параметром передает ошибку, если она есть, если нет, то null, вторым - путь до папки, куда быдем складывать все картинки
        cb(null, 'images')
    },
    filename(req, file, cb) {
        cb(null, `${new Date().toISOString()}-${file.originalname}`)
    }
})

// массив типов разрешенных для файлов
const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg']

// валидация для файлов
const fileFilter = (req, file, cb) => {
    // проверяем mimetype загружаемого файла на содержание в разрешенных
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true)
    } else {
        cb(null, false)
    }
}

module.exports = multer({
    storage,
    fileFilter
})