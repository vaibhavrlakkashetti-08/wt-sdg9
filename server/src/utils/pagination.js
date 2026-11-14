export function getPagination(query) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  return { page, limit, skip: (page - 1) * limit };
}

export function getPaginationMeta(total, page, limit) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}