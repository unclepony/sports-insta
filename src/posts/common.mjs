// 카드마다 페이지 번호를 붙여 HTML 을 만든다.
export function finish(post) {
  const total = post.cards.length;
  post.cards.forEach((c, i) => { c.html = c.make({ series: post.series, n: i + 1, total, date: post.date }); });
  return post;
}
