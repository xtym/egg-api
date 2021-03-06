const Service = require('egg').Service
const dtime = require('moment')

class OrderService extends Service {
    async postOrder() {
        const ctx = this.ctx
        const { user_id, cart_id } = ctx.params;
        const { address_id, come_from = 'mobile_web', deliver_time = '', description, entities, geohash, paymethod_id = 1 } = ctx.request.body;

        try {
            if (!(entities instanceof Array) || !entities.length) {
                throw new Error('entities参数错误')
            } else if (!(entities[0] instanceof Array) || !entities[0].length) {
                throw new Error('entities参数错误')
            } else if (!address_id) {
                throw new Error('address_id参数错误')
            } else if (!user_id || !Number(user_id)) {
                throw new Error('user_id参数错误')
            } else if (!cart_id || !Number(cart_id)) {
                throw new Error('cart_id参数错误')
            } else if (!user_id) {
                throw new Error('未登录')
            }
        } catch (err) {
            console.log(err.message, err);
            ctx.body = {
                status: 0,
                type: 'ERROR_PARAMS',
                message: err.message
            }
            return
        }

        let cartDetail;
        let order_id;

        try {
            cartDetail = await ctx.model.Cart.findOne({ id: cart_id });
            order_id = await ctx.helper.getId('order_id');
        } catch (err) {
            console.log('获取数据失败', err);
            ctx.body = {
                status: 0,
                type: 'ERROR_GET_DATA',
                message: '获取订单失败',
            }
            return
        }

        const deliver_fee = { price: cartDetail.cart.deliver_amount };
        const orderObj = {
            basket: {
                group: entities,
                packing_fee: {
                    name: cartDetail.cart.extra[0].name,
                    price: cartDetail.cart.extra[0].price,
                    quantity: cartDetail.cart.extra[0].quantity,
                },
                deliver_fee,
            },
            restaurant_id: cartDetail.cart.restaurant_id,
            restaurant_image_url: cartDetail.cart.restaurant_info.image_path,
            restaurant_name: cartDetail.cart.restaurant_info.name,
            formatted_created_at: dtime().format('YYYY-MM-DD HH:mm'),
            order_time: new Date().getTime(),
            time_pass: 900,
            status_bar: {
                color: 'f60',
                image_type: '',
                sub_title: '15分钟内支付',
                title: '',
            },
            total_amount: cartDetail.cart.total,
            total_quantity: entities[0].length,
            unique_id: order_id,
            id: order_id,
            user_id,
            address_id,
        }

        try {
            await ctx.model.Order.create(orderObj);
            ctx.body = {
                status: 1,
                success: '下单成功，请及时付款',
                need_validation: false,
            }
        } catch (err) {
            console.log('保存订单数据失败');
            ctx.body = {
                status: 0,
                type: 'ERROR_SAVE_ORDER',
                message: '保存订单失败'
            }
        }

    }

    async getOrders() {
        const ctx = this.ctx
        const user_id = ctx.params.user_id;
        const { limit = 0, offset = 0 } = ctx.query;

        try {
            if (!user_id || !Number(user_id)) {
                throw new Error('user_id参数错误')
            } else if (!Number(limit)) {
                throw new Error('limit参数错误')
            } else if (typeof Number(offset) !== 'number') {
                throw new Error('offset参数错误')
            }
        } catch (err) {
            console.log(err.message, err);
            ctx.body = {
                status: 0,
                type: 'ERROR_PARAMS',
                message: err.message
            }
            return
        }

        try {
            const orders = await ctx.model.Order.find({ user_id }).sort({ id: -1 }).limit(Number(limit)).skip(Number(offset));
            const timeNow = new Date().getTime();
            orders.map(item => {
                if (timeNow - item.order_time < 900000) {
                    item.status_bar.title = '等待支付';
                } else {
                    item.status_bar.title = '支付超时';
                }
                item.time_pass = Math.ceil((timeNow - item.order_time) / 1000);
                item.save()
                return item
            })
            ctx.body = orders
        } catch (err) {
            console.log('获取订单列表失败', err);
            ctx.body = {
                status: 0,
                type: 'ERROR_GET_ORDER_LIST',
                message: '获取订单列表失败'
            }
        }

    }

    async getDetail() {
        const ctx = this.ctx
        const { user_id, order_id } = ctx.params;

        try {
            if (!user_id || !Number(user_id)) {
                throw new Error('user_id参数错误')
            } else if (!order_id || !Number(order_id)) {
                throw new Error('order_id参数错误')
            }
        } catch (err) {
            console.log(err.message);
            ctx.body = {
                status: 0,
                type: 'GET_ERROR_PARAM',
                message: err.message,
            }
            return
        }

        try {
            const order = await ctx.model.Order.findOne({ id: order_id }, '-_id');
            const addressDetail = await ctx.model.Address.findOne({ id: order.address_id });
            const orderDetail = { ...order, ...{ addressDetail: addressDetail.address, consignee: addressDetail.name, deliver_time: '尽快送达', pay_method: '在线支付', phone: addressDetail.phone } };
            ctx.body = orderDetail
        } catch (err) {
            console.log('获取订单信息失败', err);
            ctx.body = {
                status: 0,
                type: 'ERROR_TO_GET_ORDER_DETAIL',
                message: '获取订单信息失败'
            }
        }

    }

    async getAllOrders() {
        const ctx = this.ctx
        const { restaurant_id, limit = 20, offset = 0 } = ctx.query;
        try {
            let filter = {};
            if (restaurant_id && Number(restaurant_id)) {
                filter = { restaurant_id }
            }

            const orders = await ctx.model.Order.find(filter).sort({ id: -1 }).limit(Number(limit)).skip(Number(offset));

            const timeNow = new Date().getTime();
            orders.map(item => {
                if (timeNow - item.order_time < 900000) {
                    item.status_bar.title = '等待支付';
                } else {
                    item.status_bar.title = '支付超时';
                }
                item.time_pass = Math.ceil((timeNow - item.order_time) / 1000);
                item.save()
                return item
            })
            ctx.body = orders
        } catch (err) {
            console.log('获取订单数据失败', err);
            ctx.body = {
                status: 0,
                type: 'GET_ORDER_DATA_ERROR',
                message: '获取订单数据失败'
            }
        }
    }

    async getOrdersCount() {
        const ctx = this.ctx
        const restaurant_id = ctx.query.restaurant_id;
        try {
            let filter = {};
            if (restaurant_id && Number(restaurant_id)) {
                filter = { restaurant_id }
            }

            const count = await ctx.model.Order.find(filter).count();
            ctx.body = {
                status: 1,
                count,
            }
        } catch (err) {
            console.log('获取订单数量失败', err);
            ctx.body = {
                status: 0,
                type: 'ERROR_TO_GET_COUNT',
                message: '获取订单数量失败'
            }
        }
    }

}

module.exports = OrderService