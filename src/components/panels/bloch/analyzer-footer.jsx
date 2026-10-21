import { Button } from "../../ui/button.jsx";

/**
 * @typedef {object} AnalyzerFooterProps
 * @property {() => void} onClose
 */

/**
 * The analyzer's action row: closing it.
 *
 * @param {AnalyzerFooterProps} props
 */
function AnalyzerFooter({ onClose }) {
  return (
    <div className="panel-action-row bloch-actions">
      <Button variant="outline" id="bloch-close-button" onClick={onClose}>
        Close
      </Button>
    </div>
  );
}

export { AnalyzerFooter };
