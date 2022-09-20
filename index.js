const apis = require('./apis')
const debug = require('util').debuglog('genshin')
const nodemailer = require('nodemailer')
const undici = require('undici')

let transporter
if (process.env.MAIL_HOST && process.env.MAIL_USERNAME && process.env.MAIL_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    // 使用SSL方式（安全方式，防止被窃取信息）
    secureConnection: true,
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD,
    },
  })
}

// server酱请求
function send_server(message) {
  server_url = `https://sctapi.ftqq.com/${process.env.SERVER_KEY}.send?title=${message}`
  return undici.request(server_url).then((res) => res.body.json())
}

function sendMail(text) {
  if (!transporter) return
  transporter
    .sendMail({
      // 发送方邮箱的账号
      from: `"Genshin Helper" <${process.env.MAIL_USERNAME}>`,
      // 邮箱接收者的账号
      to: process.env.MAIL_USERNAME_TO,
      subject: '原神米游社签到助手',
      text,
    })
    .then(() => debug('邮件发送成功'))
    .catch((err) => debug('邮件发送失败', err))
}

async function main() {
  debug('开始', new Date().toLocaleString())
  if (!process.env.COOKIE) {
    debug('环境变量 COOKIE 未配置，退出...')
    process.exit()
  }
  const response = await apis.getUserGameRoles()
  if (response.data) {
    const [role] = response.data.list
    const rewardInfo = await apis.getRewardInfo(role.region, role.game_uid)
    if (rewardInfo.retcode !== 0) {
      debug(rewardInfo.message)
      sendMail(rewardInfo.message)
      return
    }

    if (rewardInfo.data.first_bind) {
      debug('请先前往米游社App手动签到一次')
      sendMail('请先前往米游社App手动签到一次')
      send_server('请先前往米游社App手动签到一次~')
      return
    }
    if (!rewardInfo.data.is_sign) {
      debug('开始签到')
      const result = await apis.bbsSignReward(role.region, role.game_uid)
      debug(result.message)
      sendMail(result.message)
      send_server('result.message')
    } else {
      debug('已签到')
      sendMail('已签到')
      send_server('亲爱的旅行者:你已经签到过了~')
    }
  }
}
main()

