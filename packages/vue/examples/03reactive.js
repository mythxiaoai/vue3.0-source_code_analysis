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
  //错误处理
  //fn进入effectStack
  //fn要执行
  //fn要弹出effectStack
  const e = createReactiveEffect(fn)
  e()
  return e
}

function createReactiveEffect(fn) {
  const effectFn = function () {
    try {
      effectStack.push(effectFn)
      fn()
    } finally {
      effectStack.pop()
    }
  }
  return effectFn
}



//跟踪函数：负责依赖收集
function track(target, key) {
  //1. 获取effectFn
  const effect = effectStack[effectStack.length - 1]
  if (effect) {
    //用过target获取对应的map  每一层级的数据对应一个targetMap   target:Map
    let depMap = targetMap.get(target)
    //首次进入depMap为空,需要创建
    if (!depMap) {
      depMap = new Map()
      targetMap.set(target, depMap)
    }
    // 2. 通过key获取依赖集合set
    let deps = depMap.get(key)
    if (!deps) {
      deps = new Set()
      depMap.set(key, deps)
    }
    
    // 3. 放入effect
    deps.add(effect)
    //层级关系是 obj:{key:effect}  三层套娃   WeakMap ==> Map ==>Set
  }
}

//触发函数：track()相反操作，拿出映射关系，执行所有的cbs
function trigger(target, key) {
  const depMap = targetMap.get(target)
  if (!depMap) return
  const deps = depMap.get(key)
  if (deps) {
    deps.forEach(dep => dep())
  }
}

const obj = reactive({ a: 'a', b: { c: 1 } })

// obj.foo
// obj.foo = "666"
// obj.bar = "bar"
// delete obj.bar

effect(() => {
  console.log('effect1', obj.a)
})

effect(() => {
  console.log('effect2', obj.b.c)
})

setTimeout(() => {
  obj.a = '777'
  //当改变子节点 只会触发一次trigger 因为首层的weakmap是以target存储的
  obj.b.c = "666"
}, 2000)
console.log(targetMap);
