const {Schema, model} = require('mongoose');

const courseSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    img: String
});

// Изменяем объект курса для отображения на клиенте
courseSchema.method('toClient', function() {
    const course = this.toObject()

    course.id = course._id.toString()

    delete course._id

    return course
})

module.exports = model('Course', courseSchema);