const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

const validStatuses = [ 'pending', 'preparing', 'out-for-delivery', 'delivered' ];

function bodyDataHas(propertyName) {
    return function (req, res, next) {
        const { data = {} } = req.body;
        if (data[propertyName]) return next();
        else return next({ status: 400, message: `Order must include a ${propertyName}`});
    };
}

function dishBodyDataValid() {
    return function (req, res, next) {
        const { data = {} } = req.body;
        const dishes = data.dishes;
        if (dishes
            && Array.isArray(dishes)
            && dishes.length > 0) {
            dishes.forEach((dish, index) => {
                if (!valueIsPositiveInteger(dish.quantity)) {
                    return next({ status: 400, message: `Dish ${index} must have a quantity that is an integer greater than 0`});
                }
            });
            return next();
        }
        else return next({ status: 400, message: `Order must include at least one dish`});
    };
}

function valueIsPositiveInteger(value) {
    return value
        && typeof value === 'number'
        && Number.isInteger(value)
        && value > 0;
}

function isOrderInputValid() {
    return [
        bodyDataHas('deliverTo'),
        bodyDataHas('mobileNumber'),
        bodyDataHas('dishes'),
        dishBodyDataValid(),
    ];
}

function orderExists(req, res, next) {
    const orderId = req.params.orderId;
    const order = orders.find((dish) => dish.id === orderId);
    if (order) {
        res.locals.order = order;
        res.locals.orderId = orderId;
        next();
    }
    else return next({ status: 404, message: `Order does not exist: ${orderId}` });
}

function orderIdParamMatchesBody(req, res, next) {
    const paramValue = req.params.orderId;
    const bodyValue = req.body.data.id;
    if (!bodyValue || paramValue === bodyValue) return next();
    else return next({ status: 400, message: `Order id does not match route id. Order: ${bodyValue}, Route: ${paramValue}`})
}

function orderStatusUpdateValid(req, res, next) {
    if (res.locals.order.status === 'delivered') next({ status: 400, message: `A delivered order cannot be changed` });
    const status = req.body.data.status;
    if (validStatuses.includes(status)) return next();
    else return next({ status: 400, message: `Order must have a status of ${validStatuses.join(', ')}`});
}

function canBeDeleted(req, res, next) {
    if (res.locals.order.status !== 'pending') next({ status: 400, message: `An order cannot be deleted unless it is pending` });
    else return next();
}

function create(req, res) {
    const { data: { deliverTo, mobileNumber, status = 'pending', dishes }} = req.body;
    const newOrder = {
        id: nextId(),
        deliverTo: deliverTo,
        mobileNumber: mobileNumber,
        status: status,
        dishes: dishes,
    };
    orders.push(newOrder);
    res.status(201).json({ data: newOrder });
}

function read(req, res) {
    res.json({ data: res.locals.order });
}

function update(req, res) {
    const { data: { deliverTo, mobileNumber, status, dishes }} = req.body;
    res.locals.order = {
        ...res.locals.order,
        deliverTo: deliverTo,
        mobileNumber: mobileNumber,
        status: status,
        dishes: dishes,
    };
    res.json({ data: res.locals.order });
}

function destroy(req, res) {
    const destroyIndex = orders.findIndex((order) => order.id === res.locals.orderId);
    orders.splice(destroyIndex, 1);
    res.sendStatus(204);
}

function list(req, res) {
    res.json({ data: orders });
}

module.exports = {
    create: [...isOrderInputValid(), create],
    read: [orderExists, read],
    update: [
        orderExists,
        ...isOrderInputValid(),
        orderIdParamMatchesBody,
        bodyDataHas('status'),
        orderStatusUpdateValid,
        update
    ],
    destroy: [
        orderExists,
        canBeDeleted,
        destroy,
    ],
    list,
};

