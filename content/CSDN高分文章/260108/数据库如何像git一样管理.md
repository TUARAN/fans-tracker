# 数据库如何像 Git 一样管理：把“状态”变成“可审计的变更”

很多人第一次听到“像 Git 一样管理数据库”，直觉反应是：那是不是把数据库文件（比如 `app.db`）也提交到仓库？

但真正的“像 Git”，从来不是提交某个时刻的数据库快照，而是：**提交变更（changes）**。

Git 管理的是“从 A 到 B 我改了什么”，而不是“我把整个项目文件夹打包了一份”。数据库也一样：你要版本化的不是 `.db` 文件，而是 **schema 的演进、数据规则的演进、以及必要的数据变更脚本**。

（示意图占位：《状态快照 vs 变更脚本》— 可谷歌搜索："database snapshot vs migrations diagram"）

## 1. 把数据库拆成三层资产：Schema、Data、Runtime

要做到“像 Git 一样”，先把数据库相关内容按性质拆开。

- **Schema（结构）**：表、字段、索引、约束、视图、存储过程……这部分应该被版本控制。
- **Data（数据）**：业务数据本身（比如用户、订单、日志）通常不该进 Git；但“可再生的种子数据/基准数据”可以进 Git。
- **Runtime（运行时产物）**：`.db` 文件、WAL、临时文件、缓存表数据、导出的本地副本——这些都不该进 Git。

你提到的“数据源1：1分5次数表、数据源2：考核数据表”，它们本质属于 **schema + 业务数据** 的组合：

- 表结构（字段/索引/约束）属于 Schema，应通过迁移脚本像 commit 一样管理。
- 表里的真实数据（考核记录、次数明细）属于业务数据，不建议进 Git。
- 如果需要演示/测试，可以做一份脱敏的 seed（少量样例行）进 Git。

## 2. 把“迁移脚本”当作 commit：一条迁移 = 一个可审计的变更

最常见、最稳妥的路径就是 migrations。

你可以把迁移理解成：

- `V001__create_tables.sql`：初始化提交（initial commit）
- `V002__add_index.sql`：性能优化提交（perf commit）
- `V003__add_assessment_fields.sql`：业务需求提交（feature commit）

这套方式的关键收益是：

- 每一次结构变化都有明确原因、可 review、可回溯。
- 新环境可以从 0 重建到最新结构（就像 `git clone` 后跑 `npm i`）。
- CI 可以验证“迁移可执行”（就像验证 build 能过）。

（示意图占位：《迁移链条像 Git 提交历史》— 可谷歌搜索："database migrations commit history"）

### 2.1 两种主流风格：Versioned migrations vs Declarative schema

- **版本化迁移（推荐默认）**：按时间追加脚本（Flyway/Liquibase/Alembic 等常见）。
- **声明式 schema**：仓库里维护“目标结构”，工具计算差异并生成迁移（如 Prisma migrate 的部分模式、一些 schema diff 工具）。

工程上更稳的是：**迁移脚本是最终事实（source of truth）**，声明式只是辅助生成。

## 3. 把“环境”当作分支：dev / staging / prod 的一致性校验

很多团队数据库失控，并不是因为没有迁移，而是因为“环境漂移”：

- dev 加了字段没迁移，staging 没这个字段
- prod 临时热修了索引，仓库里没人知道

要像 Git 一样管理，你需要规定：

- **任何结构变化必须通过迁移进入主分支**（禁止直接改生产库结构当作常态）
- 每个环境部署时都跑迁移，并记录当前版本（类似 `HEAD`）
- 迁移版本、执行时间、checksum 写入数据库（工具通常会自动建一张 schema history 表）

（示意图占位：《环境漂移与“schema history 表”》— 可谷歌搜索："flyway schema history table"）

## 4. 把“数据”分为两类：可提交的 seed 与不可提交的业务数据

“像 Git 管理数据库”最容易踩坑的是数据层：很多人想把数据也版本化。

一个好用的切分法是：

### 4.1 可以提交：seed / fixture / reference data

- 少量、脱敏、可再生
- 用于本地启动、单元测试、演示环境
- 典型例子：字典表、枚举表、地区码、权限初始化、一个最小 demo 的考核样例

### 4.2 不建议提交：业务真实数据

- 任何可能包含个人信息/交易信息/运营信息的数据
- 体积会增长、diff 不可读、合并不可控

你这两张表如果要支持“开箱即用”的开发体验，我建议：

- 提交 `seed_assessment.sql`：插 5～20 行脱敏样例
- 提交 `seed_frequency.sql`：插少量样例，让 UI/报表能跑通
- 真正的考核数据与次数明细，通过测试环境导入、或专门的数据平台/对象存储分发

## 5. 最小可复现实验：用迁移 + seed 做到“像 Git 一样 clone 即可重建”

下面示例用 SQLite 演示迁移思路（重点是“结构/变更”进 Git，不是 `.db` 进 Git）。

### 5.1 目录结构

```text
migrations/
  001_create_tables.sql
  002_add_indexes.sql
seed/
  seed.sql
scripts/
  reset_db.sh
```

### 5.2 迁移脚本（示例）

`migrations/001_create_tables.sql`：

```sql
CREATE TABLE IF NOT EXISTS frequency_1min_5times (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS assessment (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  assessed_at TEXT NOT NULL
);
```

`migrations/002_add_indexes.sql`：

```sql
CREATE INDEX IF NOT EXISTS idx_frequency_user_time
ON frequency_1min_5times(user_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_assessment_user_time
ON assessment(user_id, assessed_at);
```

### 5.3 种子数据（脱敏样例）

`seed/seed.sql`：

```sql
INSERT INTO frequency_1min_5times(user_id, occurred_at, count)
VALUES
  ('u_demo_1', '2026-01-08T10:00:00Z', 5),
  ('u_demo_2', '2026-01-08T10:01:00Z', 5);

INSERT INTO assessment(user_id, score, assessed_at)
VALUES
  ('u_demo_1', 87, '2026-01-08T00:00:00Z'),
  ('u_demo_2', 92, '2026-01-08T00:00:00Z');
```

### 5.4 一键重建脚本

`scripts/reset_db.sh`：

```bash
#!/usr/bin/env bash
set -euo pipefail

rm -f app.db

# 依次执行迁移
for f in migrations/*.sql; do
  sqlite3 app.db < "$f"
done

# 导入 seed
sqlite3 app.db < seed/seed.sql

echo "OK: rebuilt app.db"
```

运行：

```bash
chmod +x scripts/reset_db.sh
./scripts/reset_db.sh
sqlite3 app.db "SELECT * FROM assessment;"
```

你会得到类似输出：

```text
1|u_demo_1|87|2026-01-08T00:00:00Z
2|u_demo_2|92|2026-01-08T00:00:00Z
```

这就实现了“像 Git 一样”的体验：**仓库里只有脚本与文本，任何人都能从 0 重建出一致的数据库状态**。

## 6. 更进一步：当你真的需要“数据版本管理”，别用 Git 存数据

如果你们确实要对“考核数据”“次数明细”做可追溯版本（比如回放指标、追查口径变更），更适合的做法通常是：

- 数据仓库/湖（用分区、快照、元数据记录版本）
- 对象存储 + manifest（每次数据导入生成一个版本号与校验和）
- 专门的数据版本工具（思路是记录数据集版本与 lineage，而不是让 Git 去合并二进制）

Git 的长处是代码协作；数据协作需要另一套系统。

（示意图占位：《代码版本库 vs 数据版本库的分工》— 可谷歌搜索："data versioning vs git"）

## 7. 收口：像 Git 管数据库的本质，是让变更可审计、可回放、可自动化

把数据库当作“可以随手改的黑盒”，你最终会得到不可预测的线上事故。

把数据库当作“像 Git 一样有历史、有 review、有 CI 的资产”，你会得到更稳定的协作节奏：

- 结构变化靠迁移进入主线
- 数据靠 seed 支撑开发体验
- 真实业务数据走脱敏/分发/数据平台

如果你愿意，我可以按你们真实字段口径，把“1分5次数表/考核数据表”抽象成一套更贴近业务的迁移命名规范（包含索引、唯一约束、以及一份最小 seed），让它完全对齐你们现在的开发流程。