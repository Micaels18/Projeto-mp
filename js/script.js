let carrinho = [];
let total = 0;

function adicionarAoCarrinho(produto, preco) {
    carrinho.push({ produto, preco });
    total += preco;
    atualizarCarrinho();
}

function atualizarCarrinho() {
    const lista = document.getElementById('lista-carrinho');
    const totalElement = document.getElementById('total');
    const quantidade = document.getElementById('quantidade-carrinho');

    lista.innerHTML = "";
    carrinho.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `${item.produto} - R$ ${item.preco.toFixed(2)} <button onclick="removerItem(${index})">Remover</button>`;
        lista.appendChild(li);
    });

    totalElement.innerText = `R$ ${total.toFixed(2)}`;
    quantidade.innerText = carrinho.length;
}

function removerItem(index) {
    total -= carrinho[index].preco;
    carrinho.splice(index, 1);
    atualizarCarrinho();
}

function abrirCarrinho() {
    document.getElementById('carrinho').classList.add('aberto');
}

function fecharCarrinho() {
    document.getElementById('carrinho').classList.remove('aberto');
}

function filtrarCategoria(categoria) {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        if (categoria === 'todos' || card.getAttribute('data-categoria') === categoria) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}
