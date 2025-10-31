// Array.prototype.findLastIndex polyfill for Node.js 16
if (!Array.prototype.findLastIndex) {
  Object.defineProperty(Array.prototype, 'findLastIndex', {
    configurable: true,
    enumerable: false,
    writable: true,
    value: function(predicate) {
      // 验证参数
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }
      
      // 获取数组对象
      const o = Object(this);
      const len = o.length >>> 0;
      
      // 从末尾向前查找
      let k = len - 1;
      while (k >= 0) {
        const kValue = o[k];
        if (predicate.call(arguments[1], kValue, k, o)) {
          return k;
        }
        k--;
      }
      
      return -1;
    }
  });
}