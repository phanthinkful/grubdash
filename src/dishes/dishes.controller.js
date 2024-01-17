const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

function bodyDataHas(propertyName) {
    return function (req, res, next) {
        const { data = {} } = req.body;
        if (data[propertyName]) return next();
        else return next({ status: 400, message: `Dish must include a ${propertyName}`});
    };
}

function bodyDataIsPositiveNumber(propertyName) {
    return function (req, res, next) {
        const { data = {} } = req.body;
        const propertyValue = data[propertyName];
        if (propertyValue
            && typeof propertyValue === 'number'
            && propertyValue > 0) return next();
        else return next({ status: 400, message: `Dish must have a ${propertyName} that is an integer greater than 0`});
    };
}

function isDishInputValid() {
    return [
        bodyDataHas('name'),
        bodyDataHas('description'),
        bodyDataHas('price'),
        bodyDataIsPositiveNumber('price'),
        bodyDataHas('image_url'),
    ];
}

function dishExists(req, res, next) {
    const dishId = req.params.dishId;
    const dish = dishes.find((dish) => dish.id === dishId);
    if (dish) {
        res.locals.dish = dish;
        next();
    }
    else return next({ status: 404, message: `Dish does not exist: ${dishId}` });
}

function dishIdParamMatchesBody(req, res, next) {
    const paramValue = req.params.dishId;
    const bodyValue = req.body.data.id;
    if (!bodyValue || paramValue === bodyValue) return next();
    else return next({ status: 400, message: `Dish id does not match route id. Dish: ${bodyValue}, Route: ${paramValue}`})
}

function create(req, res) {
    const { data: { name, description, price, image_url }} = req.body;
    const newDish = {
        id: nextId(),
        name: name,
        description: description,
        price: price,
        image_url: image_url,
    };
    dishes.push(newDish);
    res.status(201).json({ data: newDish });
}

function read(req, res) {
    res.json({ data: res.locals.dish });
}

function update(req, res) {
    const { data: { name, description, price, image_url }} = req.body;
    res.locals.dish = {
        ...res.locals.dish,
        name: name,
        description: description,
        price: price,
        image_url: image_url,
    };
    res.json({ data: res.locals.dish });
}

function list(req, res) {
    res.json({ data: dishes });
}

module.exports = {
    create: [...isDishInputValid(), create],
    read: [dishExists, read],
    update: [
        dishExists,
        ...isDishInputValid(),
        dishIdParamMatchesBody,
        update
    ],
    list,
};
