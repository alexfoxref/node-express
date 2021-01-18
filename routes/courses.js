const { Router } = require("express");
const { validationResult } = require("express-validator");
const Course = require("../models/course");
const auth = require("../middleware/auth");
const { courseValidators } = require("../utils/validators");

const isOwner = (course, req) => {
	return course.userId.toString() === req.user._id.toString();
};

const router = Router();

router.get("/", async (req, res) => {
	// Забираем все курсы из бд (если оставляем без параметров метод find)
	try {
		// Метод populate() позволяет достать всю информацию, а не только id
		// Метод select() позволяет выбрать доставаемые поля
		const courses = await Course.find()
			.populate("userId", "email name")
			.select("price title img");

		res.render("courses", {
			title: "Курсы",
			isCourses: true,
			userId: req.user ? req.user._id.toString() : null,
			courses,
		});
	} catch (e) {
		console.log(e);
	}
});

router.get("/:id", async (req, res) => {
	try {
		// Находим курс по id в бд
		const course = await Course.findById(req.params.id);

		res.render("course", {
			layout: "empty",
			title: `Курс ${course.title}`,
			course,
		});
	} catch (e) {
		console.log(e);
	}
});

router.get("/:id/edit", auth, async (req, res) => {
	// Если нет query-параметра allow, то запрещаем пользователю находиться на странице и перенаправляем его на главную страницу
	if (!req.query.allow) {
		return res.redirect("/");
	}

	try {
		// Находим курс по id в бд
		const course = await Course.findById(req.params.id);

		if (!isOwner(course, req)) {
			return res.redirect("/courses");
		}

		res.render("course-edit", {
			title: `Редактировать ${course.title}`,
			course,
			error: req.flash("error"),
		});
	} catch (e) {
		console.log(e);
	}
});

router.post("/edit", auth, courseValidators, async (req, res) => {
	const { id } = req.body;

	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		req.flash("error", errors.array()[0].msg);
		return res.status(422).redirect(`/courses/${id}/edit?allow=true`);
	}

	try {
		// Удаляем id, чтобы он не дублировался - исключаем лишние поля, т.к. mongo сам присваивает id
		delete req.body.id;

		const course = await Course.findById(id);

		if (!isOwner(course, req)) {
			return res.redirect("/courses");
		}

		Object.assign(course, req.body);
		await course.save();

		// Находим объект по id и передаем в него новые параметры
		// await Course.findByIdAndUpdate(id, req.body);

		res.redirect("/courses");
	} catch (e) {
		console.log(e);
	}
});

router.post("/remove", auth, async (req, res) => {
	try {
		// Удаление курса по id из бд
		await Course.deleteOne({
			_id: req.body.id,
			// Защита удаления курса
			userId: req.user._id,
		});

		res.redirect("/courses");
	} catch (e) {
		console.log(e);
	}
});

module.exports = router;
