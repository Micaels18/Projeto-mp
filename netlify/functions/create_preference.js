       // carrega .env em dev
import { Handler } from '@netlify/functions';
import MercadoPago from '@mercadopago/sdk-node';

const mp = new MercadoPago({
  accessToken: process.env.MP_ACCESS_TOKEN
});

/**
 * payload esperado: { items: [{ title, unit_price, quantity }, …] }
 */
export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405 };
  }

  try {
    const { items } = JSON.parse(event.body);
    const { body } = await mp.preferences.create({
      items,
      back_urls: {
        success: 'https://seu-site.com/sucesso.html',
        failure: 'https://seu-site.com/erro.html',
        pending: 'https://seu-site.com/pedido.html'
      },
      auto_return: 'approved'
    });
    return {
      statusCode: 200,
      body: JSON.stringify({ init_point: body.init_point })
    };
  } catch (e) {
    console.error('Erro MP:', e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
