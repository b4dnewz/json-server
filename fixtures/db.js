module.exports = function() {
  const rnd = Math.floor(Math.random() * (10 - 1) + 1)

  return {
    user: {
      id: 1,
      name: "John"
    },
    posts: Array(rnd).fill(0).map((v, i) => {
      const idx = i+1
      return {
        id: idx,
        body: `foo-${idx}`,
        userId: Math.random() < 0.5 ? 1 : 0
      }
    })
  }
}
