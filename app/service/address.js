const Service = require('egg').Service;
const tencentkey = 'RLHBZ-WMPRP-Q3JDS-V2IQA-JNRFH-EJBHL';
const tencentkey2 = 'RRXBZ-WC6KF-ZQSJT-N2QU7-T5QIT-6KF5X';
const tencentkey3 = 'OHTBZ-7IFRG-JG2QF-IHFUK-XTTK6-VXFBN';
const baidukey = 'fjke3YUipM9N64GdOIh1DNeK2APO2WcT';
const baidukey2 = 'fjke3YUipM9N64GdOIh1DNeK2APO2WcT';

class AddressService extends Service {
    // 获取定位地址
    async guessPosition() {
        const ctx = this.ctx
        return new Promise(async (resolve, reject) => {
            // let ip = ctx.request.headers['x-forwarded-for'] ||
            //     ctx.request.connection.remoteAddress ||
            //     ctx.request.socket.remoteAddress ||
            //     ctx.request.connection.socket.remoteAddress;
            // const ipArr = ip.split(':');
            // ip = ipArr[ipArr.length - 1];
            // if (process.env.NODE_ENV == 'development') {
            //     ip = '180.158.102.141';
            // }
            let ip = '180.158.102.141';
            try {
                let result = (await ctx.curl('http://apis.map.qq.com/ws/location/v1/ip', {
                    data: {
                        ip,
                        key: tencentkey,
                    },
                    dataType: 'json',
                })).data

                if (result.status != 0) {
                    result = (await ctx.curl('http://apis.map.qq.com/ws/location/v1/ip', {
                        data: {
                            ip,
                            key: tencentkey2,
                        }
                    })).data
                }

                if (result.status != 0) {
                    result = (await ctx.curl('http://apis.map.qq.com/ws/location/v1/ip', {
                        data: {
                            ip,
                            key: tencentkey3,
                        }
                    })).data
                }

                if (result.status == 0) {
                    const cityInfo = {
                        lat: result.result.location.lat,
                        lng: result.result.location.lng,
                        city: result.result.ad_info.city,
                    }
                    cityInfo.city = cityInfo.city.replace(/市$/, '')
                    resolve(cityInfo)
                } else {
                    reject('定位失败')
                }

            } catch (err) {
                reject(err)
            }

        })
    }

    // 搜索地址
    async searchPlace(keyword, cityName, type = 'search') {
        const ctx = this.ctx
        try {
            const resObj = (await ctx.curl('http://apis.map.qq.com/ws/place/v1/search', {
                data: {
                    key: tencentkey,
                    keyword: encodeURIComponent(keyword),
                    boundary: 'region(' + encodeURIComponent(cityName) + ',0)',
                    page_size: 10,
                },
                dataType: 'json',
            })).data
            if (resObj.status == 0) {
                return resObj
            } else {
                throw new Error('搜索位置信息失败')
            }
        } catch (err) {
            throw new Error(err);
        }
    }

    // 测量距离
    async getDistance(from, to, type) {
        const ctx = this.ctx
        try {
            let res
            res = (await ctx.curl('http://api.map.baidu.com/routematrix/v2/driving', {
                data: {
                    ak: baidukey,
                    output: 'json',
                    origins: from,
                    destinations: to,
                },
                dataType: 'json',
            })).data

            if (res.status !== 0) {
                res = (await ctx.curl('http://api.map.baidu.com/routematrix/v2/driving', {
                    data: {
                        ak: baidukey2,
                        output: 'json',
                        origins: from,
                        destinations: to,
                    },
                    dataType: 'json',
                })).data
            }

            if (res.status == 0) {
                const positionArr = [];
                let timevalue;
                res.result.forEach(item => {
                    timevalue = parseInt(item.duration.value) + 1200;
                    let durationtime = Math.ceil(timevalue % 3600 / 60) + '分钟';
                    if (Math.floor(timevalue / 3600)) {
                        durationtime = Math.floor(timevalue / 3600) + '小时' + durationtime;
                    }
                    positionArr.push({
                        distance: item.distance.text,
                        order_lead_time: durationtime,
                    })
                })
                if (type == 'tiemvalue') {
                    return timevalue
                } else {
                    return positionArr
                }
            } else {
                // console.log('[res]', JSON.stringify(res))
                throw new Error('调用百度地图测距失败');
            }
        } catch (err) {
            // console.log('获取位置距离失败')
            throw new Error(err);
        }

    }

    // 通过ip地址获取精确位置
    async geocoder() {

    }

    // 通过geohash获取精确位置
    async getpois(lat, lng) {
        const ctx = this.ctx
        try {
            const res = (await ctx.curl('http://apis.map.qq.com/ws/geocoder/v1/', {
                data: {
                    key: tencentkey,
                    location: lat + ',' + lng
                },
                dataType: 'json'
            })).data
            if (res.status == 0) {
                return res
            } else {
                throw new Error('通过获geohash取具体位置失败');
            }
        } catch (err) {
            console.log('getpois获取定位失败')
            throw new Error(err);
        }
    }
}

module.exports = AddressService;