const Subject = require("../models/Subject");
const Lession = require("../models/Lession");
const ExerciseCategory = require("../models/ExerciseCategory");
const Exercise = require("../models/Exercise");
const Result = require("../models/Result");
const ResultDetail = require("../models/ResultDetail");
const User = require("../models/User");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
class ExerciseController {
    // [GET]/exercise/:slug?name=lession
    async exercise(req, res, next) {
        try {
            const subject = await Subject.findOne({ slug: req.params.slug });
            if (subject) {
                const lession = await Lession.findOne({ slug: req.query.name });
                const exercises = await Exercise.aggregate([
                    {
                        $match: {
                            lessionID: ObjectId(lession.id),
                        },
                    },
                    {
                        $lookup: {
                            from: "exercise-categories",
                            localField: "ceID",
                            foreignField: "_id",
                            as: "Cate",
                        },
                    },
                    {
                        $project: { answer: 0 },
                    },
                ]);

                const results = await Result.aggregate([
                    {
                        $match: {
                            lessionID: ObjectId(lession.id),
                        },
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "userID",
                            foreignField: "_id",
                            as: "User",
                        },
                    },
                    { $sort: { score: -1, time: 1 } },
                    {
                        $limit: 10,
                    },
                ]);

                res.render("exercises/exercise", {
                    lession,
                    subject,
                    exercises,
                    results,
                });
            } else {
                res.render("error");
            }
        } catch (error) {
            res.render("error");
        }
    }

    async postExercise(req, res, next) {
        try {
            const lession = req.query.name;

            const lessionObj = await Lession.findOne({ slug: lession });
            const exercises = await Exercise.find({ slug: lession });

            const myJsonData = req.body.objectData;
            const myJsonObj = Object.assign({}, ...myJsonData);

            const result = new Result({
                userID: req.signedCookies.userId,
                exerciseID: myJsonObj.name,
                option: myJsonObj.value,
            });
            await result.save();

            // const result = new Result({
            //     userID: user.id,
            //     lessionID: lessionObj.id,
            //     time: myTime,
            //     score: myScoreTemp,
            // });
        } catch (error) {
            console.log(error);
        }
    }
}

module.exports = new ExerciseController();
