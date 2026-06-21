import Script from "next/script";

/** Load PDF.js only on admin pages that parse PDFs */
export default function PdfJsScript() {
  return <Script src="/pdf.min.js" strategy="lazyOnload" />;
}
