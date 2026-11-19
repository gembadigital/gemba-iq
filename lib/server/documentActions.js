import { getRequestContext } from './organizationMailbox.js';

/** Narrow soft-delete command. Never expose deleted rows or remove Storage files.
 * The actor and workspace are verified from the bearer token + membership, not
 * supplied body fields. The service client is needed because the existing
 * SELECT policy deliberately hides the new tombstone from ordinary clients.
 */
export async function deleteDocumentHandler(request, response) {
  response.setHeader('Cache-Control', 'private, no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { adminClient, organizationId } = await getRequestContext(request);
    const documentId = request.body?.documentId;
    if (typeof documentId !== 'string' || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(documentId)) {
      return response.status(400).json({ error: 'Geçersiz belge.' });
    }
    // Keep every predicate on the mutation itself: no cross-workspace TOCTOU.
    const { data, error } = await adminClient.from('documents')
      .update({ is_deleted: true })
      .eq('organization_id', organizationId)
      .eq('id', documentId)
      .eq('is_deleted', false)
      .select('id')
      .maybeSingle();
    if (error) return response.status(503).json({ error: 'Belge silinemedi. Lütfen yeniden deneyin.' });
    if (!data) return response.status(404).json({ error: 'Belge bulunamadı veya bu organizasyonda erişilemiyor.' });
    return response.status(200).json({ success: true });
  } catch (error) {
    const status = [400, 401, 403, 409, 503].includes(error.status) ? error.status : 503;
    return response.status(status).json({ error: status === 401 ? 'Oturumunuzu yenileyin.' : 'Belge silinemedi. Aktif organizasyonu ve erişiminizi kontrol edin.' });
  }
}
