export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Leer y parsear el cuerpo manualmente
    const rawBody = await new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        resolve(body);
      });
      req.on('error', reject);
    });

    const data = JSON.parse(rawBody);

    // Log para verificar que está llegando el webhook
    console.log('✅ Webhook recibido:', JSON.stringify(data, null, 2));

    const noteAttributes = data.note_attributes || [];
    const clickIdAttr = noteAttributes.find(attr => attr.name === 'click_id');
    const clickId = clickIdAttr ? clickIdAttr.value : null;

    const orderId = data.id;
    const currency = data.currency;
    const totalPrice = data.total_price;

    if (!clickId) {
      console.log('⚠️ No clickId found for order:', orderId);
      return res.status(200).json({ message: 'No clickId, skipping postback.' });
    }

    const baseDomains = [
      "binom2.com",
      "binom22.com",
      "stories-today.com",
      "track700.com"
    ];

    const postbackUrls = baseDomains.map(domain =>
      `https://${domain}/click?cnv_id=${clickId}&payout=${totalPrice}&currency=${currency}&cnv_status=${orderId}`
    );

    await Promise.all(postbackUrls.map(async (url) => {
      try {
        const response = await fetch(url);
        console.log(`✅ Sent to: ${url}, status: ${response.status}`);
      } catch (err) {
        console.error(`❌ Error sending to ${url}:`, err);
      }
    }));

    res.status(200).json({ message: 'Postbacks sent!' });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
