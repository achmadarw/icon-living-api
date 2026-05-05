declare module 'pdfkit' {
  const PDFDocument: any;
  export default PDFDocument;

  // Provide a namespaced type alias so code that references `PDFKit.PDFDocument`
  // compiles without pulling full typings.
  export namespace PDFKit {
    type PDFDocument = any;
  }
}
