
var request = require('request-promise').defaults({ simple: false });
const sleep = async time => new Promise(r => setTimeout(r, time))
var EventEmitter  = require('events').EventEmitter


class supreme extends EventEmitter {
    constructor() {
        super(); //must call super for "this" to be defined.
        this.stock=null;
        this.tasks={};
        this.delay=5000;
        this.drop_date='';
        this.setDropDate();
        this.readyQueue=[];
        this.addQueue=[];
        this.captchaQueue=[];
        this.checkoutQueue=[];
    }
    setDropDate() {
        let date = new Date();
        let m = date.getMonth()+1;
        let d = date.getDate()+(date.getDay()-4)
        this.drop_date=`${m}/${d}`
    }

    async stockMonitor() {
        console.log("Checking stock")
        let options = {
            url: "https://www.supremenewyork.com/mobile_stock.json",
            method: "GET",
            resolveWithFullResponse: true
        }
        let result = await request(options);
        if (result.statusCode == 200)
            this.stock = JSON.parse(result.body)
        return result.statusCode
    }
    async dispatch(id) {
        let stock = 1;
        let items = this.stock['products_and_categories'][this.tasks[id]['task'].category || "new"];
        for (let key in items){
            if (items[key]['name'].toLowerCase().indexOf(this.tasks[id]['task'].keywords) != -1 && items[key]['name'].toLowerCase().indexOf(this.tasks[id]['task'].type) != -1){
                this.tasks[id]['name'] = items[key]['name'];
                this.tasks[id]['productId'] = items[key]['id'];
                break;
            }
        }

        if (this.tasks[id]['productId'] == undefined) {
            console.log("Not found")
            return null;
        }
        let headers = {
            'sec-fetch-mode': 'cors',
            'origin': 'https://www.supremenewyork.com',
            'accept-language': 'en,zh-CN;q=0.9,zh;q=0.8,en-US;q=0.7,zh-TW;q=0.6',
            'x-requested-with': 'XMLHttpRequest',
            'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25',
            'accept': 'application/json',
            'referer': 'https://www.supremenewyork.com/mobile',
            'authority': 'www.supremenewyork.com',
            'sec-fetch-site': 'same-orgin'
        };

        let options = {
            url: `https://www.supremenewyork.com/shop/${this.tasks[id]['productId']}.json`,
            method: "GET",
            headers: headers,
            resolveWithFullResponse: true
        }
        //console.log(options.url)
        let result = await request(options);
        //console.log(result)
        let products = JSON.parse(result.body)['styles'];
        for (let key in products){
            if (products[key]['name'].toLowerCase().indexOf(this.tasks[id]['task'].color) != -1){
                this.tasks[id]['task']['st'] = products[key]['id'];
                //console.log(products[key]['name'])
                if (products[key]['sizes'].length == 1) {
                    this.tasks[id]['task']['s'] = products[key]['sizes'][0]['id'];
                    stock = products[key]['sizes'][0]['stock_level'];
                } else {
                    for (let key2 in products[key]['sizes']){
                        if (products[key]['sizes'][key2]['name'].toLowerCase().indexOf(this.tasks[id]['task'].size) != -1){
                            this.tasks[id]['task']['s'] = products[key]['sizes'][key2]['id'];
                            stock = products[key]['sizes'][key2]['stock_level'];
                            console.log(stock)
                            if (stock < 1 && this.tasks[id]['task'].size == "")
                                continue
                            break;
                        }
                    }
                }
                break;
            }
        }
        return stock
    }
    async addWin (id) {

      let add= `fetch("https://www.supremenewyork.com/shop/${this.tasks[id]['productId']}/add.json", {"credentials":"include","headers":{"accept":"application/json","user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25", "accept-language":"en,zh-CN;q=0.9,zh;q=0.8,en-US;q=0.7,zh-TW;q=0.6","content-type":"application/x-www-form-urlencoded","sec-fetch-mode":"cors","sec-fetch-site":"same-origin","x-requested-with":"XMLHttpRequest"},"referrer":"https://www.supremenewyork.com/mobile","referrerPolicy":"no-referrer-when-downgrade","body":"s=${this.tasks[id]['task']['s']}&st=${this.tasks[id]['task']['st']}&qty=1","method":"POST","mode":"cors"}).then(result=>{console.log(result.text())});`
      console.log(add)
      let result = await this.tasks[id]['win'].webContents.executeJavaScript(add, true)
      console.log(result)
      return 

    }
    async add (id) {
      let n = Date.now()
        let headers = {
            'sec-fetch-mode': 'cors',
            'origin': 'https://www.supremenewyork.com',
            'accept-encoding': 'gzip, deflate, br',
            'accept-language': 'en,zh-CN;q=0.9,zh;q=0.8,en-US;q=0.7,zh-TW;q=0.6',
            'x-requested-with': 'XMLHttpRequest',
            'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25',
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'accept': 'application/json',
            'referer': 'https://www.supremenewyork.com/mobile',
            'authority': 'www.supremenewyork.com',
            'sec-fetch-site': 'same-orgin'
        };
        
        let dataString = `s=${this.tasks[id]['task']['s']}&st=${this.tasks[id]['task']['st']}&qty=1`;
        let options = {
            url: `https://www.supremenewyork.com/shop/${this.tasks[id]['productId']}/add.json`,
            method: 'POST',
            headers: headers,
            body: dataString,
            resolveWithFullResponse: true
        };
        let response = await request(options);
        if (response.statusCode != 200){
            console.log(response.statusCode)
            return false
        } else {
          console.log(response.body.length)
        }
        let cookies = response.headers['set-cookie']
        for (let c of cookies){
          let cookie ={
              url: 'https://www.supremenewyork.com',
              domain: ".supremenewyork.com",
              httpOnly: false,
              name: c.substring(0,c.indexOf('=')),
              path: "/",
              value: c.substring(c.indexOf('=')+1, c.indexOf(';'))
          }
          //let cookie = { url: 'https://www.supremenewyork.com', name: c.substring(0,session.indexOf('=')), value: c.substring(c.indexOf('=')+1, c.indexOf(';')), domain:".supremenewyork.com" }
          try{
            this.tasks[id].win.webContents.session.cookies.set(cookie)
          } catch(e){
              console.log(e)
          }
      }
      
      console.log(Date.now - n)
        return JSON.parse(response.body)


    }

    async setCaptcha(id, token) {
        console.log(id,token)
        this.tasks[id]['token'] = token
        this.checkoutQueue.push(id)
    }

    async CheckoutD(id) {
      this.tasks[id].win.loadURL("https://www.supremenewyork.com/checkout?order%5Bterms%5D=1")

      let checkout = `$('#g-recaptcha-response').val('${this.tasks[id]['token']}');$(':contains(number)').next().val('${[this.tasks[id]['person']['cn'].slice(0,4),this.tasks[id]['person']['cn'].slice(4,8),this.tasks[id]['person']['cn'].slice(8,12),this.tasks[id]['person']['cn'].slice(12)].join(' ')}');$('#credit_card_month').val('${this.tasks[id]['person']['cmy'].substr(0, this.tasks[id]['person']['cmy'].indexOf('/'))}');$('#credit_card_year').val(${this.tasks[id]['person']['cmy'].substr(this.tasks[id]['person']['cmy'].indexOf('/')+1)});$('input[placeholder="CVV"]').val(${this.tasks[id]['person'].cvv});if(window.pookyCallback){window.pookyCallback();};$.post('/checkout.json', $('#checkout_form').serialize()).done(function(data) {})`
      console.log(checkout)
      let result = await this.tasks[id].win.webContents.executeJavaScript(checkout);
      try {
          console.log(JSON.stringify(result))
      } catch(err) {
          console.log(err)
      }
      //return "Checkout "+ result.status.toUpperCase()
  }
}

let supreme_bot = new supreme();

var readyDispatching = setInterval(async () => {
    if (supreme_bot.readyQueue.length <1)
      return
    try {
      let result
      let id = supreme_bot.readyQueue.shift()
      if(supreme_bot.tasks[id]['task']["st"] != undefined && supreme_bot.tasks[id]['task']["s"] != undefined) {
        result = 1;
      } else if (supreme_bot.stock != null) {
        result = await supreme_bot.dispatch(id)
      } else {
        supreme_bot.readyQueue.unshift(id)
        return
      }
  
      if ( result != 0 && result != null) {
        supreme_bot.addQueue.push(id)
        supreme_bot.emit('product_change', id,supreme_bot.tasks[id]['name'])
      } else if(result == 0){
        supreme_bot.emit('status_change', id,"OOS & CATCHING")
        supreme_bot.readyQueue.push(id)
      } else {
        console.log(supreme_bot.tasks[id]['st']+" "+ supreme_bot.tasks[id]['s'])
        supreme_bot.readyQueue.push(id)
      }
    } catch(err) {
      console.log(err)
    }
    
  }, 10);
  
  var addDispatching = setInterval(async () => {
    if (supreme_bot.addQueue.length <1)
      return
    try {
      let result
      let id = supreme_bot.addQueue[0]
      supreme_bot.addQueue.splice(0,1);
      supreme_bot.emit('status_change', id,"ADDING")
      result = await supreme_bot.add(id)
      console.log(result)
      if (result.length < 1) {
        supreme_bot.emit('status_change', id,"OOS")
      } else if (result.length > 0) {
        supreme_bot.emit('status_change', id,"ADDED")
        supreme_bot.captchaQueue.push(id)
        supreme_bot.emit('status_change', id,"IN CAPTCHAQUEUE")
      } else if (result == false) {
        supreme_bot.emit('status_change', id, "INT ERR")
      } else {
        supreme_bot.emit('status_change', id, result)
      }
    } catch(err) {
      console.log(err)
    }
  }, 10);

  var checkoutDispatching = setInterval(async () => {
    if (supreme_bot.checkoutQueue.length <1)
      return
    try {
      let id =supreme_bot.checkoutQueue.shift()
      supreme_bot.emit('status_change', id,"CHECKOUTING")
      supreme_bot.CheckoutD(id)
    } catch (err) {
      console.log(err)
    }
  }, 10);




module.exports=supreme_bot;