const tagAttrReg = /(<[^\/\s]+)([^<>]+)(\/?>)/gm
const attrValueReg = /([^\s]+)=(["'])(((?!\2).)*[\u4e00-\u9fa5]+((?!\2).)*)\2/gim

const getTransformValue = (statement:string, externalQuote:string) => {
  const internalQuote = externalQuote === '"' ? "'" : '"'
  const i18nKey = 'test'
  statement = statement.replace(/(`)(((?!\1).)*[\u4e00-\u9fa5]+((?!\1).)*)\1/g, (_:string, _quote:string, value:string) => {
    let matchIndex = 0
    const expressionArr: string[] = []
    value = value.replace(/\${([^}]+)}/g, (_:string, expression:string) => {
      expressionArr.push(expression)
      return `\${${matchIndex++}}`
    })
    const key = `${internalQuote}${i18nKey}${internalQuote}`
    if(expressionArr.length) {
      return `$t(${key}, [${expressionArr.join(',')}])`
    } else {
      return `$t(${key})`
    }
  })
  //替换\' \"
  statement = statement.replace(/\\'/g, '&sbquo;').replace(/\\"/g, '&quot;')
  statement = statement.replace(/(['"])(((?!\1).)*[\u4e00-\u9fa5]+((?!\1).)*)\1/gm, (_:string, quote:string, value:string) => {
    const key = `${internalQuote}${i18nKey}${internalQuote}`
    return `$t(${quote}${key}${quote})`
  })
  return statement
}
export const processTemplate = (content: string):string => {
  content = content.replace(tagAttrReg, (_:string, tag:string, attr:string, end:string) => {
    attr = attr.replace(attrValueReg, (_attr:string, key:string, quote:string, value:string) => {
      const whiteList = ['style', 'class', 'src', 'href', 'width', 'height']
      if(whiteList.includes(key.trim())) {
        return _attr
      }
      if(key.startsWith(':') || key.match(/^(v-|@)/)) {
        value = getTransformValue(value, quote)
        return `${key}=${quote}${value}${quote}`
      }
      if(!['true', 'false'].includes(value)
        && isNaN(Number(value))
      ) {
        value = quote === '"' ? `'${value}'` : `"${value}"`
        value = getTransformValue(value, quote)
        return `v-bind:${key}=${quote}${value}${quote}`
      }
      return _attr
    })

    return attr
  })
  return content
}