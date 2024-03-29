const Subject = require("../models/Subject");
const Unit = require("../models/Unit");
const Lession = require("../models/Lession");
const Theory = require("../models/Theory");
const Exercise = require("../models/Exercise");
const User = require("../models/User");
const Result = require("../models/Result");
const Statistical = require("../models/Statistical");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const fs = require("fs");
const pdf = require("pdf-creator-node");
const path = require("path");
const options = require("../../utils/options");
class TheoryController {
    // [GET]/theories?lession
    async detail(req, res) {
        try {
            if (ObjectId.isValid(req.query.lession)) {
                const lession = await Lession.findById(req.query.lession);
                if (lession) {
                    const theory = await Theory.aggregate([
                        { $match: { lessionID: ObjectId(req.query.lession) } },
                        {
                            $lookup: {
                                from: "lessions",
                                localField: "lessionID",
                                foreignField: "_id",
                                as: "lession",
                            },
                        },
                        {
                            $unwind: "$lession",
                        },
                        {
                            $lookup: {
                                from: "units",
                                localField: "lession.unitID",
                                foreignField: "_id",
                                as: "lession.unit",
                            },
                        },
                        {
                            $unwind: "$lession.unit",
                        },
                        {
                            $lookup: {
                                from: "subjects",
                                localField: "lession.unit.subjectID",
                                foreignField: "_id",
                                as: "lession.unit.subject",
                            },
                        },
                    ]);
                    res.render("theories/detail", {
                        theory,
                        lession,
                        success: req.flash("success"),
                        errors: req.flash("error"),
                    });
                } else {
                    res.render("error");
                }
            } else {
                res.render("error");
            }
        } catch (error) {
            console.log(error);
        }
    }

    // [PUT]/theories/:id
    async update(req, res) {
        if (req.body.content === "") {
            req.flash(
                "error",
                "Vui lòng nhập nội dung lý thuyết cho môn học này!"
            );
            res.redirect("back");
            return;
        }
        await Theory.updateOne({ _id: req.params.id }, req.body);
        req.flash("success", "Cập nhật thành công!");
        res.redirect("back");
    }

    // [GET]/theories/create
    async create(req, res) {
        if (ObjectId.isValid(req.query.lession)) {
            const lession = await Lession.findOne({ _id: req.query.lession });
            const unit = await Unit.findOne({ _id: lession.unitID });
            const subject = await Subject.findOne({ _id: unit.subjectID });
            const theory = await Theory.findOne({ lessionID: lession._id });
            if (theory) {
                res.redirect(`/theories/detail?lession=${lession._id}`);
                return;
            }
            res.render("theories/create", {
                lession,
                subject,
                unit,
                errors: req.flash("error"),
            });
        } else {
            res.render("error");
        }
    }

    // [POST]/theories/create
    async postCreate(req, res) {
        if (req.body.content === "") {
            req.flash(
                "error",
                "Vui lòng nhập nội dung lý thuyết cho môn học này!"
            );
            res.redirect("back");
            return;
        }
        const theory = new Theory(req.body);
        await theory.save();
        req.flash("success", "Thêm mới thành công!");
        res.redirect("back");
    }

    // [DELETE]/theories/:id
    async delete(req, res) {
        const theory = await Theory.findById(req.params.id);
        const lession = await Lession.findById(theory.lessionID);
        const unit = await Unit.findById(lession.unitID);
        const subject = await Subject.findById(unit.subjectID);
        await theory.delete();
        req.flash("success", "Xóa thành công!");
        res.redirect(`/subjects/${subject._id}/content`);
    }

    // [POST]/theories/:id/export
    async generatePdf(req, res) {
        const html = fs.readFileSync(
            path.join(__dirname, "../../resources/views/templates/theory.html"),
            "utf-8"
        );
        const lession = await Lession.findById(req.params.id);
        if (lession) {
            const unit = await Unit.findById(lession.unitID);
            const subject = await Subject.findById(unit.subjectID);
            const filename = lession.slug + "_doc" + ".pdf";
            const theory = await Theory.aggregate([
                { $match: { lessionID: ObjectId(lession._id) } },
                {
                    $lookup: {
                        from: "lessions",
                        localField: "lessionID",
                        foreignField: "_id",
                        as: "lession",
                    },
                },
            ]);

            let down = path.resolve(
                __dirname,
                `../../public/exports/${filename}`
            );
            const obj = {
                theory: theory,
                lessionName: lession.name,
                lessionNumber: lession.lessionNumber,
                unitName: unit.name,
                subjectName: subject.name,
                subjectGrade: subject.gradeID,
            };
            const document = {
                html: html,
                data: {
                    theorys: obj,
                },
                path: down,
            };

            pdf.create(document, options)
                .then(() => {
                    res.download(document.path);
                })
                .catch((error) => {
                    console.log(error);
                });
        }
    }
}

module.exports = new TheoryController();
