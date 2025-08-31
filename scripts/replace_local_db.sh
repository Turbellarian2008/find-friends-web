#!/bin/bash

# 创建备份目录
mkdir -p db_backup

# 获取当前时间戳
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# 备份现有数据库（如果存在）
if [ -f local.db ]; then
    echo "正在备份本地数据库..."
    cp local.db "db_backup/local-backup-$TIMESTAMP.db"
    echo "本地数据库已备份至: db_backup/local-backup-$TIMESTAMP.db"
fi

# 从云端下载数据库
echo "正在从云端下载数据库..."
wrangler d1 export find-friends-db --remote --output="local.db"

# 检查是否下载成功
if [ $? -eq 0 ]; then
    echo "\n✅ 数据库已成功从云端下载并替换本地数据库"
    echo "当前数据库大小: $(du -h local.db | cut -f1)"
else
    echo "\n❌ 数据库下载失败，请检查网络连接或Wrangler配置"
    # 恢复备份（如果存在）
    if [ -f "db_backup/local-backup-$TIMESTAMP.db" ]; then
        echo "正在恢复本地数据库备份..."
        cp "db_backup/local-backup-$TIMESTAMP.db" local.db
        echo "已恢复本地数据库备份"
    fi
    exit 1
fi
