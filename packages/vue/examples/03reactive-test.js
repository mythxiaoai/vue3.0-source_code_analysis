function reactive(obj) {
  if (!isObject(obj)) {
    return obj
  }
  return new Proxy(obj, {
    get(target, key) {
      //容错率不错，错误会正确的处理
      const res = Reflect.get(target, key)
      console.log('get', res)
      track(target, key)
      return isObject(res) ? reactive(res) : res
    },
    set(target, key, value) {
      const res = Reflect.set(target, key, value)
      console.log('set', key)
      trigger(target, key)
      return res
    },
    deleteProperty(target, key) {
      const res = Reflect.deleteProperty(target, key)
      console.log('del', key)
      trigger(target, key)
      return res
    }
  })
}

function isObject(obj) {
  return typeof obj === 'object'
}

// 保存函数
const effectStack = []

//保存映射关系的数据结构
const targetMap = new WeakMap()

//触发依赖收集
function effect(fn) {
  try {
    effectStack.push(fn)
    fn()
  } finally {
    effectStack.pop()
  }
}

//跟踪函数：负责依赖收集
function track(target, key) {
  let effectFn = effectStack[effectStack.length - 1]
  if(!effectFn)return;
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }
  //找key
  let deps = depsMap.get(key)
  if (!deps) {
    deps = new Set()
    depsMap.set(key, deps)
  }
  deps.add(effectFn)
}

//触发函数：track()相反操作，拿出映射关系，执行所有的cbs
function trigger(target, key) {
  let depsMap = targetMap.get(target);
  if(!depsMap)return;
  let deps = depsMap.get(key);
  deps && deps.forEach(dep =>dep())
}

const obj = reactive({ foo: 'foo', n: { a: 1 } })

// obj.foo
// obj.foo = "666"
// obj.bar = "bar"
// delete obj.bar

effect(() => {
  console.log('effect1', obj.foo)
})

effect(() => {
  console.log('effect2', obj.n.a)
})

setTimeout(() => {
  obj.foo = '777'
  obj.n.a = '666'
}, 2000)
