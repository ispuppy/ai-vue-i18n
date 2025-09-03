const tagAttrReg = /(<[^\/\s]+)([^<>]+)(\/?>)/gm
const attrValueReg = /([^\s]+)=(["'])(((?!\2).)*[\u4e00-\u9fa5]+((?!\2).)*)\2/gim

export const processTemplate = (content: string):string => {
  return content
}