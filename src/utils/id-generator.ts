let id = 1;

function* generateID(): Generator<number> {
  while (true) yield id++;
}

const generator = generateID();

function getID(): number {
  return generator.next().value;
}

export { getID };