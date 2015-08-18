$(main);

function main() {
    $('form').submit(run);
}

function run() {
    var data = getDataFromForm('form');
    if (valid(data)) {
        showResult(new Patient(data));
    }
    return false;
}

function valid(data) {
    var valid = validateNumber(data, 'bpSys', 30, 800) &&
        validateNumber(data, 'bpDias', 20, 440) &&
        validateNumber(data, 'age', 0, 130) &&
        validateNumber(data, 'weight', 30, 400) &&
        validateNumber(data, 'height', false, 250);
    if ((data.height > 0.5) && (data.height < 2.2)) {
        data.height *= 100;
        $('input#height').val(data.height);
    }
    return valid;
}

function validateNumber(data, name, lowest, highest) {
    deleteErrors();
    if (!data[name]) {
        showError(name, 'Feld muss ausgefüllt werden');
        return false;
    }
    if (isNaN(+data[name])) {
        data[name] = data[name].replace(',', '.');
        if (isNaN(+data[name])) {
            showError(name, 'Feld enthält keine Zahl');
            return false;
        }
        $('input#' + name).val(data[name]);
    }
    if (lowest && (+data[name] < lowest)) {
        showError(name, 'Feld enthält unrealistisch kleine Zahl');
        return false;
    }
    if (highest && (+data[name] > highest)) {
        showError(name, 'Feld enthält unrealistisch große Zahl');
        return false;
    }
    return true;
}

function deleteErrors() {
    $('label[for] span.error').remove();
}

function showError(field, text) {
    $("label[for=" + field + "]").append(
        " <span class='error'>" + text + "</span>"
    );
}

function getDataFromForm(jQ) {
    var form = $(jQ),
    input = form.find('input, select, textarea'),
    data = input.map(function () {
        return [[
            this.id,
            $(this).attr('type') == 'checkbox' ?
                ($(this).prop('checked') ? $(this).val() : null) :
                $(this).val()
        ]];
    }).get();
    return _.object(data);
}

function Patient(data) {
    // blood pressure
    var bpCatBorders = {
        sys:  [120, 130, 140, 160, 180],
        dias: [ 80,  85,  90, 100, 110]
    },
    bpCatText = [
        "gut bzw. sehr gut",
        "noch im grünen Bereich",
        "leicht erhöht",
        "zu hoch",
        "deutlich zu hoch",
    ],
    calcBpCat = function (data) {
        for (cat = bpCatBorders.sys.length - 1; cat > 0; cat--) {
            if (data.bpSys  >= bpCatBorders.sys[cat] ||
                data.bpDias >= bpCatBorders.dias[cat]) {
                return cat + 1;
            }
        }
        return 1;
    };
    this.bpCat = calcBpCat(data);
    this.bpText = "Ihr Blutdruck ist mit " +
        data.bpSys + "/" + data.bpDias + " mmgHG " +
        bpCatText[this.bpCat - 1] + '.';

    // age
    this.age = +data.age;

    // risk factors and organ failures
    var ZR5 = false,
    ZR4 = false,
    RF = 0,
    orgFailParts = [],
    riskFakParts = [],
    rcCatText = [
        "gesund.",
        "gesund. Es gibt aber Risikofaktoren die Sie belasten",
        "gesund. Es gibt aber mehrere Risikofaktoren die Sie belasten",
        "belastet",
        "geschädigt",
    ];
    // ZR5
    if (data.stroke == "on") {
        ZR5 = true;
        orgFailParts.push("Schlaganfall");
    }
    if (data.heartDisease == "on") {
        ZR5 = true;
        orgFailParts.push("koronare Herzerkrankung behandelt/unbehandelt");
    }
    if (data.heartFailure == "on") {
        ZR5 = true;
        orgFailParts.push("Herzinsuffizenz");
    }
    if (data.highGradeRenalDysfunction == "on") {
        ZR5 = true;
        orgFailParts.push("hochgradige Nierenfehlfunktion (Stadium ≥ 4)");
    }
    if (data.diabetesWithExtraRisks == "on") {
        ZR5 = true;
        orgFailParts.push("Diabetes mit weiteren Zusatzrisiken");
    }
    if (data.intermittentClaudication == "on") {
        ZR5 = true;
        orgFailParts.push("auffällige Schaufensterkrankheit (pAVK)");
    }
    // ZR4
    if (data.diabetes == "on") {
        ZR4 = true;
        orgFailParts.push("Diabetes ohne weiteren Endorganschaden");
    }
    if (data.moderatelyGradeRenalDysfunction == "on") {
        ZR4 = true;
        orgFailParts.push("mäßiggradige Nierenfehlfunktion (Stadium 3)");
    }
    if (data.unobtrusiveClaudication == "on") {
        ZR4 = true;
        orgFailParts.push("unauffällige Schaufensterkrankheit (pAVK)");
    }
    if (ZR5 || ZR4) {
        this.orgFailText = "Folgende Organschäden belasten Sie: " + orgFailParts.join(", ") + ".";
    } else {
        this.orgFailText = "";
    }
    // RF
    this.sexMale = data.sex == "männlich";
    var heightM = data.height / 100,
        adipositas_ab_BMI = 30;
    if (this.sexMale) {
        RF++;
        riskFakParts.push("Geschlecht");
    }
    if ((this.sexMale && (this.age >= 55)) || (this.age >= 65)) {
        RF++;
        riskFakParts.push("Alter");
    }
    if (data.smoking == "on") {
        RF++;
        riskFakParts.push("Tabakkonsum");
    }
    if (data.cholesterol == "on") {
        RF++;
        riskFakParts.push("auffällige Blutfettwerte (Cholesterin)");
    }
    this.bmi = data.weight / heightM / heightM;
    if (this.bmi > adipositas_ab_BMI) {
        RF++;
        riskFakParts.push("Adipositas (BMI ≥ 30)");
    }
    if (data.inherited == "on") {
        RF++;
        riskFakParts.push("Herz-/ Gefäßerkrankungen der Eltern in frühen Jahren");
    }
    if (RF > 0) {
        this.riskFakText = "Folgende weitere Risikofaktoren bestehen: Ihr " + riskFakParts.join(", ") + ".";
    } else {
        this.riskFakText = "";
    }

    if (ZR5) {
        this.rcCat = 5;
    } else if (ZR4) {
        this.rcCat = 4;
    } else if (RF > 2) {
        this.rcCat = 3;
    } else if (RF > 0) {
        this.rcCat = 2;
    } else {
        this.rcCat = 1;
    }
    this.rcText = "Ihr Herz und Ihre Gefäße sind " +
        rcCatText[this.rcCat - 1] + '.';
}

function showResult(patient) {
    $('.table tbody td').text("");

    $('.table tbody')
        .find('tr').eq(patient.rcCat - 1)
        .find('td').eq(patient.bpCat - 1)
        .text('x');
    $('.table').show();

    $('.text').text(
        patient.bpText + ' ' +
        patient.rcText + ' ' +
        patient.orgFailText + ' ' +
        patient.riskFakText
    );

    $('.sexAge').text(
        (patient.sexMale ? 'm' : 'w') + '/' + patient.age + ' J.');

    $('.BMI').text(Math.round(patient.bmi * 10) / 10);
}
