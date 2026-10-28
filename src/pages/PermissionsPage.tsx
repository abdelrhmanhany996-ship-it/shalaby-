import { useState } from "react";
import { useCRM } from "../context/CRMContext";
import {
  defaultPermissionMatrix,
  togglePermission,
  isDirector,
  permissionDefinitions,
  permissionProfile,
  profileNames,
  type PermissionMatrix,
  type PermissionProfile,
  type Permission,
} from "../lib/permissions";
export function PermissionsPage() {
  const { effectiveUser, permissionMatrix, updatePermissionMatrix, users } = useCRM();
  const [draft, setDraft] = useState<PermissionMatrix>(() =>
    structuredClone(permissionMatrix || defaultPermissionMatrix),
  );
  const [selectedProfile, setSelectedProfile] =
    useState<PermissionProfile>("branch");
  const [saved, setSaved] = useState(false);
  if (!isDirector(effectiveUser)) return null;
  // The four positions of the company, always. Older positions are not shown here.
  const profiles: PermissionProfile[] = ["director", "general", "branch", "employee"];
  const toggle = (profile: PermissionProfile, permission: Permission) => {
    setSaved(false);
    setDraft((prev) => ({
      ...prev,
      [profile]: togglePermission(
        prev[profile],
        permission,
        !prev[profile].includes(permission),
      ),
    }));
  };
  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">إدارة المؤسسة</span>
          <h1>مصفوفة الصلاحيات</h1>
          <p>
            حدد ما يستطيع كل منصب عرضه وتنفيذه. تطبّق التغييرات بعد الحفظ على
            جميع موظفي المنصب. تفعيل إجراء يفعّل صلاحيات العرض اللازمة له؛ إلغاء
            العرض يلغي الإجراءات التابعة له.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            updatePermissionMatrix(draft);
            setSaved(true);
          }}
        >
          حفظ الصلاحيات
        </button>
      </div>
      {saved && (
        <p className="status-pill is-success" role="status">
          تم حفظ الصلاحيات وتطبيقها
        </p>
      )}
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>صلاحيات كل منصب</h2>
            <p>
              صاحب البيزنس ومدير المبيعات العام ومدير مبيعات الفرع والسيلز.
              مدير المبيعات العام بيدير الموظفين تحت صاحب البيزنس دايمًا (تعديل بياناتهم وإعادة تعيين كلمات المرور)، وده مش بيتقفل من هنا.
            </p>
          </div>
        </div>
        <label
          className="field permission-profile-picker"
          style={{ padding: "0 22px 20px" }}
        >
          <span>عرض صلاحيات منصب</span>
          <select
            aria-label="عرض صلاحيات منصب"
            value={selectedProfile}
            onChange={(e) =>
              setSelectedProfile(e.target.value as PermissionProfile)
            }
          >
            {profiles.map((profile) => (
              <option key={profile} value={profile}>
                {profileNames[profile]}
              </option>
            ))}
          </select>
        </label>
        <div className="table-scroll">
          <table className="data-table permission-table no-stack">
            <thead>
              <tr>
                <th>الصلاحية</th>
                {profiles.map((p) => (
                  <th
                    key={p}
                    className={`permission-column ${p === selectedProfile ? "is-selected" : ""}`}
                  >
                    {profileNames[p]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissionDefinitions.map(([key, label]) => (
                <tr key={key}>
                  <th scope="row">{label}</th>
                  {profiles.map((profile) => (
                    <td
                      key={profile}
                      className={`permission-column ${profile === selectedProfile ? "is-selected" : ""}`}
                    >
                      <input
                        type="checkbox"
                        aria-label={`${profileNames[profile]}: ${label}`}
                        checked={draft[profile].includes(key)}
                        disabled={profile === "general" && (key === "staff.manage" || key === "staff.view")}
                        title={profile === "general" && key === "staff.manage" ? "ثابتة لمدير المبيعات العام" : undefined}
                        onChange={() => toggle(profile, key)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row">إدارة مصفوفة الصلاحيات</th>
                {profiles.map((p) => (
                  <td
                    key={p}
                    className={`permission-column ${p === selectedProfile ? "is-selected" : ""}`}
                  >
                    {p === "director" ? "صاحب البيزنس فقط" : "—"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="quiet-note">
          النطاق ثابت: المدير العام كل الفروع، المشرف العام الفروع المكلّف بها
          أو جميع الفروع، المشرف المختص الفروع المحددة له، مدير الفرع فرعه،
          والموظف سجلاته وتكليفاته. السماح بالتواصل أو إتمام متابعة يتطلب إسناد
          العميل أو المهمة للموظف نفسه.
        </p>
      </section>
      <div className="panel-header">
        <p>
          تغييرات هذه النسخة التجريبية تُحفظ في هذا المتصفح. يلزم ربطها بتسجيل
          الدخول والخادم قبل الاعتماد الفعلي.
        </p>
        <button
          className="btn-secondary"
          onClick={() => {
            setDraft(structuredClone(defaultPermissionMatrix));
            setSaved(false);
          }}
        >
          استعادة الافتراضي في المسودة
        </button>
      </div>
    </div>
  );
}
