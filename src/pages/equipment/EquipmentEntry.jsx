import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  RiAlarmWarningLine, RiArrowLeftLine, RiLoader4Line,
  RiQrCodeLine, RiRefreshLine, RiToolsLine,
} from "react-icons/ri";
import EquipmentDetails from "./EquipmentDetails/EquipmentDetails.jsx";
import { extractEquipmentQrToken } from "../../api/equipment.api.js";
import { useEquipmentByQr } from "../../hooks/useEquipment.js";
import { useI18n } from "../../i18n/index.js";
import "./EquipmentEntry.css";

function getErrorMessage(error) {
  if (error?.response?.status === 404) return "Оборудование с таким QR-кодом не найдено";
  return error?.response?.data?.error || error?.message || "Не удалось определить оборудование по QR-коду";
}
function EntryState({ icon: Icon, title, description, tone = "blue", children }) {
  return (
    <div className="eq-entry mx-auto max-w-[1800px] p-7">
      <div className="eq-entry__center">
        <div className="eq-entry__card">
          <span className={`eq-entry__icon eq-entry__icon--${tone}`}><Icon size={27} /></span>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
export default function EquipmentEntry() {
  useI18n();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const routeValue = String(id ?? "").trim();
  const isNumericId = /^\d+$/.test(routeValue);
  const qrToken = useMemo(
    () => isNumericId ? "" : extractEquipmentQrToken(routeValue),
    [isNumericId, routeValue],
  );
  const qrQuery = useEquipmentByQr(qrToken, { enabled: !isNumericId && Boolean(qrToken) });
  useEffect(() => {
    if (isNumericId) return;
    const equipmentId = Number(qrQuery.data?.id);
    if (Number.isFinite(equipmentId) && equipmentId > 0) {
      navigate(`/equipment/${equipmentId}`, { replace: true });
    }
  }, [isNumericId, qrQuery.data?.id, navigate]);
  if (isNumericId) return <EquipmentDetails />;
  if (!qrToken) {
    return (
      <EntryState icon={RiAlarmWarningLine} tone="red" title="Некорректный QR-код" description="В ссылке отсутствует корректный код оборудования. Проверьте QR и попробуйте ещё раз.">
        <button type="button" className="eq-entry__primary" onClick={() => navigate("/equipment")}><RiArrowLeftLine size={17} /> К списку оборудования</button>
      </EntryState>
    );
  }
  if (qrQuery.isLoading || (qrQuery.isFetching && !qrQuery.data)) {
    return (
      <EntryState icon={RiQrCodeLine} title="Проверяем QR-код" description="Определяем оборудование и открываем его карточку">
        <RiLoader4Line className="eq-entry__spinner" size={25} />
      </EntryState>
    );
  }
  if (qrQuery.isError && !qrQuery.data) {
    return (
      <EntryState icon={RiAlarmWarningLine} tone="red" title="Оборудование не найдено" description={getErrorMessage(qrQuery.error)}>
        <div className="eq-entry__token"><small>QR token</small><code>{qrToken}</code></div>
        <div className="eq-entry__actions">
          <button type="button" className="eq-entry__secondary" onClick={() => qrQuery.refetch()}><RiRefreshLine size={17} /> Повторить</button>
          <button type="button" className="eq-entry__primary" onClick={() => navigate("/equipment")}><RiArrowLeftLine size={17} /> К оборудованию</button>
        </div>
      </EntryState>
    );
  }
  return <EntryState icon={RiToolsLine} title="Открываем оборудование" description="QR-код найден. Перенаправляем в карточку..."><RiLoader4Line className="eq-entry__spinner" size={25} /></EntryState>;
}
